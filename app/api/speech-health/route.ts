import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const SPEECH = process.env.SPEECH_SERVICE_URL || process.env.TRANSCRIBE_SERVICE_URL || "http://127.0.0.1:8000";
  try {
    const r = await fetch(`${SPEECH}/health`, {
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    return NextResponse.json({ ok: r.ok });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
