import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/asr";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const form = await req.formData();
  const audio = form.get("audio") || form.get("file");
  if (!(audio instanceof File)) return NextResponse.json({ error: "Missing audio" }, { status: 400 });
  if (audio.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Chunk too large" }, { status: 413 });
  if (audio.size < 2000) return NextResponse.json({ text: "", transcript: "" });

  try {
    const arrayBuffer = await audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const m = String(form.get("mode") ?? "live");
    const mode = m === "final" ? "final" : m === "partial" ? "partial" : "live";
    const prompt = String(form.get("prompt") ?? "").slice(0, 1000);
    const result = await transcribeAudio(buffer, { mode, prompt });
    return NextResponse.json({
      text: result.text,
      transcript: result.text,
      engine: result.engine,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("Transcribe chunk error:", err?.message || e);
    return NextResponse.json({ error: "Transcription failed", text: "", transcript: "" }, { status: 500 });
  }
}
