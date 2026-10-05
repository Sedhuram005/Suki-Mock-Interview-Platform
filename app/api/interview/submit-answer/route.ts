import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/models/Interview";

const MAX_AUDIO_BYTES = 3_000_000;
const MAX_VIDEO_BYTES = 12_000_000;

const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/aac": "aac",
  "audio/flac": "flac",
  "audio/mp3": "mp3",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/x-m4a": "m4a",
  "audio/x-wav": "wav",
};

const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

function isFile(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== "string" && typeof value.arrayBuffer === "function";
}

function baseMimeType(value: string) {
  return value.split(";", 1)[0].trim().toLowerCase();
}

async function uploadToGridFs(
  bucket: InstanceType<typeof mongoose.mongo.GridFSBucket>,
  fileId: mongoose.Types.ObjectId,
  filename: string,
  bytes: Buffer,
  metadata: Record<string, string | number>,
) {
  const uploadStream = bucket.openUploadStreamWithId(fileId, filename, { metadata });
  await new Promise<void>((resolve, reject) => {
    uploadStream.once("error", reject);
    uploadStream.once("finish", resolve);
    uploadStream.end(bytes);
  });
}

export async function POST(req: Request) {
  let audioBucket: InstanceType<typeof mongoose.mongo.GridFSBucket> | null = null;
  let videoBucket: InstanceType<typeof mongoose.mongo.GridFSBucket> | null = null;
  let audioFileId: mongoose.Types.ObjectId | null = null;
  let videoFileId: mongoose.Types.ObjectId | null = null;

  try {
    await dbConnect();
    const form = await req.formData();
    const interviewId = String(form.get("interviewId") ?? "");
    const questionId = Number(form.get("questionId"));
    const questionText = String(form.get("questionText") ?? "");
    const audioFile = form.get("audio");
    const videoFile = form.get("video");
    const audioMimeType = String(
      (isFile(audioFile) && audioFile.type) || form.get("audioMimeType") || "audio/webm",
    );
    const videoMimeType = String(
      (isFile(videoFile) && videoFile.type) || form.get("videoMimeType") || "video/webm",
    );
    const isLast = form.get("isLast") === "true";

    if (
      !mongoose.isValidObjectId(interviewId) ||
      !Number.isInteger(questionId) ||
      !questionText.trim() ||
      !isFile(audioFile) ||
      !isFile(videoFile)
    ) {
      return NextResponse.json({ error: "Valid audio and video interview files are required." }, { status: 400 });
    }

    const audioExtension = AUDIO_EXTENSIONS[baseMimeType(audioMimeType)];
    const videoExtension = VIDEO_EXTENSIONS[baseMimeType(videoMimeType)];
    if (!audioExtension || !videoExtension) {
      return NextResponse.json(
        { error: "Unsupported recording format. Record audio as WebM/Opus or MP4 and video as WebM or MP4." },
        { status: 415 },
      );
    }
    if (audioFile.size > MAX_AUDIO_BYTES || videoFile.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "The audio or video recording is too large." }, { status: 413 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    if (!audioBuffer.length || !videoBuffer.length) {
      return NextResponse.json({ error: "The audio or video recording is empty." }, { status: 400 });
    }

    audioBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "interviewAudio" });
    videoBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "interviewVideos" });
    audioFileId = new mongoose.Types.ObjectId();
    videoFileId = new mongoose.Types.ObjectId();

    await uploadToGridFs(
      audioBucket,
      audioFileId,
      `interview-${interviewId}-question-${questionId}.${audioExtension}`,
      audioBuffer,
      { interviewId, questionId, contentType: audioMimeType },
    );
    await uploadToGridFs(
      videoBucket,
      videoFileId,
      `interview-${interviewId}-question-${questionId}.${videoExtension}`,
      videoBuffer,
      { interviewId, questionId, contentType: videoMimeType },
    );

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
            audioFileId,
            mimeType: audioMimeType,
            videoFileId,
            videoMimeType,
            translationStatus: "pending",
          },
        },
        ...(isLast ? { $set: { status: "Completed" } } : {}),
      },
      { new: true, projection: { status: 1 } },
    );

    if (!updated) {
      await Promise.allSettled([
        audioBucket.delete(audioFileId),
        videoBucket.delete(videoFileId),
      ]);
      audioFileId = null;
      videoFileId = null;
      return NextResponse.json(
        { error: "Session not found, completed, or answer already saved." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      status: updated.status,
      translationStatus: "pending",
    });
  } catch (error) {
    const cleanup: Promise<unknown>[] = [];
    if (audioBucket && audioFileId) cleanup.push(audioBucket.delete(audioFileId).catch(() => {}));
    if (videoBucket && videoFileId) cleanup.push(videoBucket.delete(videoFileId).catch(() => {}));
    await Promise.allSettled(cleanup);
    console.error("Interview answer save failed", error);
    return NextResponse.json({ error: "Could not save the original audio and video. Please retry." }, { status: 503 });
  }
}
