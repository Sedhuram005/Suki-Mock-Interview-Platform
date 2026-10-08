import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/models/Interview";

type InterviewAnswer = {
  questionId: number;
  questionText: string;
  transcript?: string;
  asrEngine?: string;
  transcriptionStatus?: "completed" | "failed";
  processedAt?: Date | null;
  evaluationStatus?: "pending" | "processing" | "completed" | "failed";
  evaluation?: {
    communication?: number;
    technical?: number;
    relevance?: number;
    completeness?: number;
    clarity?: number;
    overall?: number;
    summary?: string;
  } | null;
  evaluatedAt?: Date | null;
  audioFileId?: mongoose.Types.ObjectId | string | null;
  audioBase64?: string;
  draftEnglishText?: string;
  englishText?: string;
  humanVerified?: boolean;
  verifiedAt?: Date | null;
  videoFileId?: mongoose.Types.ObjectId | string | null;
  submittedAt?: Date;
};

type InterviewResult = {
  sessionName: string;
  status: "In Progress" | "Interactive Assessment Complete" | "Completed";
  answers?: InterviewAnswer[];
};

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const id = params.get("interviewId");
    const questionIdParam = params.get("questionId");
    const questionId = questionIdParam === null ? null : Number(questionIdParam);

    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Valid interviewId is required." }, { status: 400 });
    }
    if (questionIdParam !== null && !Number.isInteger(questionId)) {
      return NextResponse.json({ error: "Valid questionId is required." }, { status: 400 });
    }

    await dbConnect();
    const doc = (await Interview.findById(id).lean()) as InterviewResult | null;
    if (!doc) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

    const answers = (doc.answers ?? [])
      .filter((answer) => questionId === null || answer.questionId === questionId)
      .map((answer) => {
        const audioUrl = answer.audioFileId
          ? `/api/interview/audio/${answer.audioFileId.toString()}`
          : answer.audioBase64
            ? `/api/interview/audio?interviewId=${encodeURIComponent(id)}&questionId=${encodeURIComponent(String(answer.questionId))}`
            : null;
        const videoUrl = answer.videoFileId
          ? `/api/interview/video/${answer.videoFileId.toString()}`
          : null;
        const humanVerified = answer.humanVerified === true;

        return {
          questionId: answer.questionId,
          questionText: answer.questionText,
          transcript: answer.transcript || (humanVerified ? answer.englishText : answer.draftEnglishText || answer.englishText) || "",
          asrEngine: answer.asrEngine || "",
          transcriptionStatus: answer.transcriptionStatus || (answer.transcript || answer.englishText || answer.draftEnglishText ? "completed" : "failed"),
          processedAt: answer.processedAt ?? null,
          evaluationStatus: answer.evaluationStatus || "pending",
          evaluation: answer.evaluation ?? null,
          evaluatedAt: answer.evaluatedAt ?? null,
          draftEnglishText: answer.draftEnglishText || (!humanVerified ? answer.englishText : "") || "",
          englishText: humanVerified ? answer.englishText ?? "" : "",
          humanVerified,
          verifiedAt: answer.verifiedAt ?? null,
          submittedAt: answer.submittedAt ?? null,
          audioUrl,
          videoUrl,
        };
      });

    return NextResponse.json({
      interviewId: id,
      sessionName: doc.sessionName,
      status: doc.status,
      answers,
    });
  } catch (error) {
    console.error("Interview results extraction failed", error);
    return NextResponse.json({ error: "Could not load interview results. Check the database connection and try again." }, { status: 503 });
  }
}
