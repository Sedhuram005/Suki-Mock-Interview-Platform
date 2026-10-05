import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/models/Interview";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 25_000_000;
const AUDIO_MIME_TYPES = new Set([
  "audio/aac",
  "audio/flac",
  "audio/mp3",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);

type LegacyInterview = {
  answers?: Array<{
    questionId: number;
    audioBase64?: string;
    mimeType?: string;
  }>;
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const interviewId = params.get("interviewId") ?? "";
  const questionId = Number(params.get("questionId"));

  if (!mongoose.isValidObjectId(interviewId) || !Number.isInteger(questionId)) {
    return Response.json({ error: "Valid interviewId and questionId are required." }, { status: 400 });
  }

  try {
    await dbConnect();
    const doc = (await Interview.findById(interviewId).select("answers").lean()) as LegacyInterview | null;
    const answer = doc?.answers?.find((item) => item.questionId === questionId);
    if (!answer?.audioBase64) return Response.json({ error: "Audio not found." }, { status: 404 });

    const audio = Buffer.from(answer.audioBase64, "base64");
    if (!audio.length) return Response.json({ error: "Audio is empty." }, { status: 404 });
    if (audio.length > MAX_AUDIO_BYTES) return Response.json({ error: "Audio exceeds the playback size limit." }, { status: 413 });

    const storedMimeType = String(answer.mimeType ?? "audio/webm").split(";", 1)[0].trim().toLowerCase();
    const contentType = AUDIO_MIME_TYPES.has(storedMimeType) ? storedMimeType : "audio/webm";
    const body = new Uint8Array(audio.length);
    body.set(audio);

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(audio.length),
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Legacy interview audio retrieval failed", error);
    return Response.json({ error: "Could not load interview audio." }, { status: 503 });
  }
}
