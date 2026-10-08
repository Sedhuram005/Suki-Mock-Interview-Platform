import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const SPEECH = process.env.SPEECH_SERVICE_URL || process.env.TRANSCRIBE_SERVICE_URL;

  if (SPEECH) {
    try {
      const r = await fetch(`${SPEECH.replace(/\/+$/, "")}/health`, {
        signal: AbortSignal.timeout(2500),
        cache: "no-store",
      });
      return NextResponse.json({ ok: r.ok, engine: "remote-whisper" });
    } catch {
      return NextResponse.json({ ok: false, engine: "remote-whisper" });
    }
  }

  // If local server is running on localhost, check it
  try {
    const r = await fetch("http://127.0.0.1:8000/health", {
      signal: AbortSignal.timeout(1000),
      cache: "no-store",
    });
    if (r.ok) {
      return NextResponse.json({ ok: true, engine: "local-whisper" });
    }
  } catch {
    // Expected in cloud preview
  }

  // In cloud preview (Vercel), native browser Web Speech API is the primary engine
  return NextResponse.json({
    ok: true,
    engine: "browser-speech-recognition",
    cloud: true,
  });
}
