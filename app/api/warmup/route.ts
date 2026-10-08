import { NextResponse } from "next/server";

const SPEECH_SERVICE_URL =
  process.env.SPEECH_SERVICE_URL || process.env.TRANSCRIBE_SERVICE_URL || "http://127.0.0.1:8000";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    // Warm up the transcription service
    const response = await fetch(SPEECH_SERVICE_URL + "/warmup", {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.warn("Transcription service warmup failed, will load on first request");
      return NextResponse.json({ status: "service_not_ready" });
    }

    return NextResponse.json({ status: "warmed_up" });
  } catch (e) {
    console.warn("Transcription service not available, will load on first request");
    return NextResponse.json({ status: "service_not_available" });
  }
}
