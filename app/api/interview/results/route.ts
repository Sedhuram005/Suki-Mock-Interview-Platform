import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/models/Interview";
import { transcribeAndTranslate } from "@/lib/transcribe";

export const runtime = "nodejs";
export const maxDuration = 300;

type InterviewAnswer = {
  questionId: number;
  questionText: string;
  audioFileId?: mongoose.Types.ObjectId | string | null;
  audioBase64?: string;
  mimeType?: string;
  transcript?: string;
  originalText?: string;
  englishText?: string;
  language?: string;
  confidence?: number | null;
  needsReview?: boolean;
  videoFileId?: mongoose.Types.ObjectId | string | null;
  translationStatus?: "pending" | "done" | "needs_review" | "failed";
  submittedAt?: Date;
};

type InterviewResult = {
  sessionName: string;
  status: "In Progress" | "Completed";
  answers?: InterviewAnswer[];
};

async function readGridFsAudio(
  bucket: InstanceType<typeof mongoose.mongo.GridFSBucket>,
  fileId: mongoose.Types.ObjectId,
) {
  const file = await bucket.find({ _id: fileId }).next();
  if (!file) throw new Error("The original audio file is missing from GridFS.");
  if (file.length === 0) throw new Error("The original audio file is empty.");
  if (file.length > 25_000_000) throw new Error("The audio file exceeds the local translation size limit.");

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = bucket.openDownloadStream(fileId);
    stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.once("error", reject);
    stream.once("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function getAudioBytes(
  answer: InterviewAnswer,
  audioBucket: InstanceType<typeof mongoose.mongo.GridFSBucket>,
) {
  if (answer.audioFileId) {
    if (!mongoose.isValidObjectId(answer.audioFileId)) throw new Error("The stored audio reference is invalid.");
    return readGridFsAudio(audioBucket, new mongoose.Types.ObjectId(answer.audioFileId));
  }

  // Legacy interviews stored audio inline before the GridFS migration.
  if (answer.audioBase64) {
    const bytes = Buffer.from(answer.audioBase64, "base64");
    if (bytes.length > 25_000_000) throw new Error("The audio file exceeds the local translation size limit.");
    return bytes;
  }

  throw new Error("No saved audio is available for this answer.");
}

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const id = params.get("interviewId");
    const refresh = params.get("refresh") === "1";
    const questionIdParam = params.get("questionId");
    const questionId = questionIdParam === null ? null : Number(questionIdParam);

    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Valid interviewId is required." }, { status: 400 });
    }
    if (questionIdParam !== null && !Number.isInteger(questionId)) {
      return NextResponse.json({ error: "Valid questionId is required." }, { status: 400 });
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection is not ready.");
    const doc = (await Interview.findById(id).lean()) as InterviewResult | null;
    if (!doc) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

    const answersInScope = (doc.answers ?? []).filter(
      (answer) => questionId === null || answer.questionId === questionId,
    );
    const pending = answersInScope.filter(
      (answer) => refresh || !answer.translationStatus || answer.translationStatus === "pending",
    );
    const audioBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "interviewAudio" });

    // Keep local CPU inference sequential so one result request does not load multiple model jobs at once.
    for (const answer of pending) {
      try {
        const audioBytes = await getAudioBytes(answer, audioBucket);
        const result = await transcribeAndTranslate(audioBytes, answer.mimeType ?? "audio/webm");
        const translationIsReliable = !result.needsReview;
        const translationStatus = translationIsReliable ? "done" : "needs_review";
        const englishText = translationIsReliable ? result.englishText : "";
        await Interview.updateOne(
          { _id: id, "answers.questionId": answer.questionId },
          {
            $set: {
              "answers.$.englishText": englishText,
              "answers.$.language": result.language,
              "answers.$.confidence": result.confidence,
              "answers.$.needsReview": result.needsReview,
              "answers.$.translationStatus": translationStatus,
            },
          },
        );
        Object.assign(answer, result, { englishText, translationStatus });
      } catch (error) {
        console.error("Local English translation failed for question", answer.questionId, error);
        answer.needsReview = true;
        answer.translationStatus = "failed";
        const failureSet: Record<string, string | boolean | null> = {
          "answers.$.needsReview": true,
          "answers.$.translationStatus": "failed",
        };
        // A failed retry must not leave older, unverified English visible.
        answer.englishText = "";
        answer.language = "";
        answer.confidence = null;
        failureSet["answers.$.englishText"] = "";
        failureSet["answers.$.language"] = "";
        failureSet["answers.$.confidence"] = null;
        await Interview.updateOne(
          { _id: id, "answers.questionId": answer.questionId },
          { $set: failureSet },
        );
      }
    }

    const answers = (doc.answers ?? []).map((answer) => {
      const videoUrl = answer.videoFileId
        ? `/api/interview/video/${answer.videoFileId.toString()}`
        : null;
      const audioUrl = answer.audioFileId
        ? `/api/interview/audio/${answer.audioFileId.toString()}`
        : answer.audioBase64
          ? `/api/interview/audio?interviewId=${encodeURIComponent(id)}&questionId=${encodeURIComponent(String(answer.questionId))}`
        : null;
      const englishAnswer = Object.fromEntries(
        Object.entries(answer).filter(([field]) =>
          field !== "audioBase64" &&
          field !== "audioFileId" &&
          field !== "transcript" &&
          field !== "originalText" &&
          field !== "videoFileId",
        ),
      );
      // Older records may still contain machine output that was flagged for review.
      // Keep it out of the results API until a reliable replacement is available.
      if (answer.needsReview || answer.translationStatus === "needs_review") {
        englishAnswer.englishText = "";
      }
      return { ...englishAnswer, audioUrl, videoUrl };
    });

    return NextResponse.json({
      interviewId: id,
      sessionName: doc.sessionName,
      status: doc.status,
      answers,
    });
  } catch (error) {
    console.error("Interview results extraction failed", error);
    return NextResponse.json({ error: "Could not load English results. Check MongoDB and the local Whisper service." }, { status: 503 });
  }
}
