import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/models/Interview";

const MAX_AUDIO_BYTES = 3_000_000;
const MAX_VIDEO_BYTES = 12_000_000;

function isFile(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== "string" && typeof value.arrayBuffer === "function";
}

export async function POST(req: Request) {
  let videoBucket: InstanceType<typeof mongoose.mongo.GridFSBucket> | null = null;
  let videoFileId: mongoose.Types.ObjectId | null = null;

  try {
    const form = await req.formData();
    const interviewId = String(form.get("interviewId") ?? "");
    const questionId = Number(form.get("questionId"));
    const questionText = String(form.get("questionText") ?? "");
    const audioFile = form.get("audio");
    const videoFile = form.get("video");
    const audioMimeType = String(form.get("audioMimeType") || "audio/webm");
    const videoMimeType = String(form.get("videoMimeType") || "video/webm");
    const isLast = form.get("isLast") === "true";

    if (
      !mongoose.isValidObjectId(interviewId) ||
      !Number.isInteger(questionId) ||
      !questionText.trim() ||
      !isFile(audioFile) ||
      !isFile(videoFile) ||
      !audioMimeType.startsWith("audio/") ||
      !videoMimeType.startsWith("video/")
    ) {
      return NextResponse.json({ error: "Valid audio and video interview files are required." }, { status: 400 });
    }
    if (audioFile.size > MAX_AUDIO_BYTES || videoFile.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "The audio or video recording is too large." }, { status: 413 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    if (audioBuffer.length === 0 || videoBuffer.length === 0) {
      return NextResponse.json({ error: "The audio or video recording is empty." }, { status: 400 });
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection is not ready.");

    videoBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "interviewVideos" });
    videoFileId = new mongoose.Types.ObjectId();
    const uploadStream = videoBucket.openUploadStreamWithId(
      videoFileId,
      `interview-${interviewId}-question-${questionId}.webm`,
      { metadata: { interviewId, questionId, contentType: videoMimeType } },
    );
    await new Promise<void>((resolve, reject) => {
      uploadStream.once("error", reject);
      uploadStream.once("finish", resolve);
      uploadStream.end(videoBuffer);
    });

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
            questionText: questionText.trim(),
            audioBase64: audioBuffer.toString("base64"),
            mimeType: audioMimeType,
            videoFileId,
            videoMimeType,
          },
        },
        ...(isLast ? { $set: { status: "Completed" } } : {}),
      },
      { new: true, projection: { status: 1 } },
    );

    if (!updated) {
      await videoBucket.delete(videoFileId).catch(() => {});
      videoFileId = null;
      return NextResponse.json(
        { error: "Session not found, completed, or answer already saved" },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    if (videoBucket && videoFileId) await videoBucket.delete(videoFileId).catch(() => {});
    console.error(error);
    return NextResponse.json({ error: "Failed to save the audio and video answer." }, { status: 503 });
  }
}