import { NextResponse } from "next/server";
import { warmupOllama } from "@/lib/ollama";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const models = await warmupOllama(body?.includeAsr === true, body?.includeScoring !== false);
  return NextResponse.json({
    ok: (models.asrSkipped || models.asrReady) && (models.scoringSkipped || models.scoringReady),
    models,
  });
}
