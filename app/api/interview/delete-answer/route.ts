import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/models/Interview";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { interviewId, questionId } = await req.json();

    if (!mongoose.isValidObjectId(interviewId) || !Number.isInteger(questionId)) {
      return NextResponse.json({ error: "Invalid interview or question ID." }, { status: 400 });
    }

    // Find the interview
    const interview = await Interview.findOne({ _id: interviewId, status: "In Progress" });
    if (!interview) {
      return NextResponse.json({ error: "Interview not found or not in progress." }, { status: 404 });
    }

    // Find the answer to remove
    const answerIndex = interview.answers.findIndex((a: any) => a.questionId === questionId);
    if (answerIndex === -1) {
      return NextResponse.json({ ok: true }); // already deleted
    }

    const answer = interview.answers[answerIndex];

    // Remove from array
    interview.answers.splice(answerIndex, 1);
    await interview.save();

    // Delete files asynchronously so we don't block the UI
    const deleteFiles = async () => {
      try {
        const audioBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "interviewAudio" });
        const videoBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "interviewVideos" });
        if (answer.audioFileId) await audioBucket.delete(answer.audioFileId).catch(() => {});
        if (answer.videoFileId) await videoBucket.delete(answer.videoFileId).catch(() => {});
      } catch (err) {
        console.error("Failed to cleanup files after deleting answer", err);
      }
    };
    void deleteFiles();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete answer error", err);
    return NextResponse.json({ error: "Could not delete the answer." }, { status: 500 });
  }
}
