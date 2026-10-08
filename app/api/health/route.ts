import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  const SPEECH = process.env.SPEECH_SERVICE_URL || process.env.TRANSCRIBE_SERVICE_URL || "http://127.0.0.1:8000";
  const OLLAMA = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
  const out: Record<string, unknown> = {};

  const check = async (name: string, fn: () => Promise<unknown>) => {
    const t = Date.now();
    try {
      out[name] = { ok: true, detail: await fn(), ms: Date.now() - t };
    } catch (e: unknown) {
      const err = e as { message?: string };
      out[name] = { ok: false, error: String(err?.message ?? e) };
    }
  };

  await check("speech", async () => {
    const r = await fetch(`${SPEECH}/health`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
  await check("ollama", async () => {
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as { models?: Array<{ name: string }> };
    return (data.models ?? []).map((m) => m.name);
  });
  await check("mongodb", async () => {
    await (await getDb()).command({ ping: 1 });
    return "connected";
  });

  return NextResponse.json(out);
}
