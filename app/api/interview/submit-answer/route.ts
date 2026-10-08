import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/models/Interview";
import { AsrError, transcribeAudio } from "@/lib/asr";

const MAX_AUDIO_BYTES = 3_000_000;
const MAX_SPEECH_AUDIO_BYTES = 10_000_000;
const MAX_VIDEO_BYTES = 12_000_000;

export const runtime = "nodejs";
export const maxDuration = 300;

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
    const speechAudioFile = form.get("speechAudio");
    const liveTranscript = String(form.get("liveTranscript") ?? "").replace(/\s+/g, " ").trim();
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
      !isFile(videoFile) ||
      (!liveTranscript && !isFile(speechAudioFile))
    ) {
      return NextResponse.json({ error: "Valid audio and video interview files are required." }, { status: 400 });
    }
    if (liveTranscript.length > 20_000) {
      return NextResponse.json({ error: "The English transcript is too long. Please shorten your answer and retry." }, { status: 413 });
    }

    const audioExtension = AUDIO_EXTENSIONS[baseMimeType(audioMimeType)];
    const videoExtension = VIDEO_EXTENSIONS[baseMimeType(videoMimeType)];
    if (!audioExtension || !videoExtension) {
      return NextResponse.json(
        { error: "The audio or video format is not supported. Please record your answer again." },
        { status: 415 },
      );
    }
    if (
      audioFile.size > MAX_AUDIO_BYTES ||
      (isFile(speechAudioFile) && speechAudioFile.size > MAX_SPEECH_AUDIO_BYTES) ||
      videoFile.size > MAX_VIDEO_BYTES
    ) {
      return NextResponse.json({ error: "The audio or video recording is too large." }, { status: 413 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const speechAudioBuffer = isFile(speechAudioFile) ? Buffer.from(await speechAudioFile.arrayBuffer()) : null;
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    if (!audioBuffer.length || (speechAudioBuffer && !speechAudioBuffer.length) || !videoBuffer.length) {
      return NextResponse.json({ error: "The audio or video recording is empty." }, { status: 400 });
    }
    if (!liveTranscript && !speechAudioBuffer?.length) {
      return NextResponse.json({ error: "Speech transcription audio is missing. Please retry the recording." }, { status: 400 });
    }

    audioBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "interviewAudio" });
    videoBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "interviewVideos" });
    audioFileId = new mongoose.Types.ObjectId();
    videoFileId = new mongoose.Types.ObjectId();

    const hasCompleteLive = Boolean(liveTranscript && liveTranscript.split(/\s+/).filter(Boolean).length >= 1);
    const [asrOutcome, audioOutcome, videoOutcome] = await Promise.allSettled([
      hasCompleteLive
        ? Promise.resolve({ text: liveTranscript, engine: "browser-speech-recognition-en" })
        : speechAudioBuffer
          ? transcribeAudio(speechAudioBuffer, { mode: "final", prompt: questionText })
          : Promise.resolve({ text: liveTranscript || "", engine: "faster-whisper-en" }),
      uploadToGridFs(
      audioBucket,
      audioFileId,
      `interview-${interviewId}-question-${questionId}.${audioExtension}`,
      audioBuffer,
      { interviewId, questionId, contentType: audioMimeType },
      ),
      uploadToGridFs(
      videoBucket,
      videoFileId,
      `interview-${interviewId}-question-${questionId}.${videoExtension}`,
      videoBuffer,
      { interviewId, questionId, contentType: videoMimeType },
      ),
    ]);
    if (asrOutcome.status === "rejected") throw asrOutcome.reason;
    if (audioOutcome.status === "rejected") throw audioOutcome.reason;
    if (videoOutcome.status === "rejected") throw videoOutcome.reason;
    const transcript = asrOutcome.value.text || liveTranscript || "";
    if (transcript.split(/\s+/).filter(Boolean).length === 0) {
      await Promise.allSettled([audioBucket.delete(audioFileId), videoBucket.delete(videoFileId)]);
      audioFileId = null;
      videoFileId = null;
      throw new AsrError("No spoken words were detected. Please verify your microphone and speak clearly in English.", 422);
    }

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
            transcript,
            asrEngine: asrOutcome.value.engine,
            transcriptionStatus: "completed",
            processedAt: new Date(),
            evaluationStatus: "pending",
          },
        },
        ...(isLast ? { $set: { status: "Interactive Assessment Complete" } } : {}),
      },
      { returnDocument: "after", projection: { status: 1 } },
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
      questionId,
      transcript,
      asrEngine: asrOutcome.value.engine,
      evaluationStatus: "pending",
    });
  } catch (error) {
    const cleanup: Promise<unknown>[] = [];
    if (audioBucket && audioFileId) cleanup.push(audioBucket.delete(audioFileId).catch(() => {}));
    if (videoBucket && videoFileId) cleanup.push(videoBucket.delete(videoFileId).catch(() => {}));
    await Promise.allSettled(cleanup);
    console.error("Interview answer save failed", error);
    if (error instanceof AsrError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Could not save the original audio and video. Please retry." }, { status: 503 });
  }
}
