import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/models/Interview";

const MAX_BASE64 = 4_000_000;

export async function POST(req: Request) {
  try {
    const { interviewId, questionId, questionText, audioBase64, transcript, mimeType, isLast } = await req.json();

    if (!mongoose.isValidObjectId(interviewId) || typeof questionId !== "number" ||
        !questionText || !audioBase64) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (audioBase64.length > MAX_BASE64) {
      return NextResponse.json({ error: "Recording too large" }, { status: 413 });
    }
    if (transcript !== undefined && (typeof transcript !== "string" || transcript.length > 20_000)) {
      return NextResponse.json({ error: "Transcript is invalid or too large" }, { status: 400 });
    }

    await dbConnect();
    const updated = await Interview.findOneAndUpdate(
      {
        _id: interviewId,
        status: "In Progress",
        "answers.questionId": { $ne: questionId },
      },
      {
        $push: {
          answers: {
            questionId,
            questionText,
            audioBase64,
            transcript: transcript ?? "",
            mimeType,
          },
        },
        ...(isLast ? { $set: { status: "Completed" } } : {}),
      },
      { new: true, projection: { status: 1 } }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Session not found, completed, or answer already saved" },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save answer" }, { status: 503 });
  }
}
