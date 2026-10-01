import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/models/Interview";
import { transcribeAndTranslate } from "@/lib/transcribe";

export const runtime = "nodejs";
export const maxDuration = 60;

type InterviewAnswer = {
  questionId: number;
  questionText: string;
  audioBase64: string;
  transcript?: string;
  mimeType?: string;
  originalText?: string;
  englishText?: string;
  language?: string;
  confidence?: number | null;
  needsReview?: boolean;
  videoFileId?: mongoose.Types.ObjectId | string | null;
  translationStatus?: "pending" | "done" | "failed";
  submittedAt?: Date;
};

type InterviewResult = {
  sessionName: string;
  status: "In Progress" | "Completed";
  answers?: InterviewAnswer[];
};

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const id = params.get("interviewId");
    const refresh = params.get("refresh") === "1";

    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Valid interviewId is required" }, { status: 400 });
    }

    await dbConnect();
    const doc = (await Interview.findById(id).lean()) as InterviewResult | null;
    if (!doc) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const pending = (doc.answers ?? []).filter(
      (answer) => refresh || answer.translationStatus !== "done",
    );

    if (pending.length > 0 && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Translation service is not configured." }, { status: 503 });
    }

    await Promise.allSettled(
      pending.map(async (answer) => {
        try {
          const result = await transcribeAndTranslate(
            answer.audioBase64,
            answer.mimeType ?? "audio/webm",
          );
          await Interview.updateOne(
            { _id: id, "answers.questionId": answer.questionId },
            {
              $set: {
                "answers.$.originalText": result.originalText,
                "answers.$.englishText": result.englishText,
                "answers.$.language": result.language,
                "answers.$.confidence": result.confidence,
                "answers.$.needsReview": result.needsReview,
                "answers.$.translationStatus": "done",
              },
            }
          );

          Object.assign(answer, result, { translationStatus: "done" });
        } catch (err) {
          console.error("Translation failed for question", answer.questionId, err);
          answer.englishText = "";
          answer.needsReview = true;
          answer.translationStatus = "failed";
          await Interview.updateOne(
            { _id: id, "answers.questionId": answer.questionId },
            {
              $set: {
                "answers.$.englishText": "",
                "answers.$.confidence": null,
                "answers.$.needsReview": true,
                "answers.$.translationStatus": "failed",
              },
            },
          );
        }
      })
    );

    const includeOriginal = params.get("includeOriginal") === "1";
    const answers = (doc.answers ?? []).map((answer) => {
      const videoUrl = answer.videoFileId
        ? `/api/interview/video/${answer.videoFileId.toString()}`
        : null;
      const englishAnswer = Object.fromEntries(
        Object.entries(answer).filter(([field]) =>
          field !== "audioBase64" && field !== "transcript" && field !== "originalText" && field !== "videoFileId",
        ),
      );
      return {
        ...englishAnswer,
        videoUrl,
        ...(includeOriginal ? { originalText: answer.originalText } : {}),
      };
    });

    return NextResponse.json({
      interviewId: id,
      sessionName: doc.sessionName,
      status: doc.status,
      answers,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load results. Please try again." }, { status: 503 });
  }
}
