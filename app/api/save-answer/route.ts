import { NextResponse } from "next/server";
import { getDb, getBucket } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const form = await req.formData();
  const audio = form.get("audio");
  const transcript = String(form.get("transcript") ?? "").trim();
  const sessionId = String(form.get("sessionId") ?? "");
  const questionId = String(form.get("questionId") ?? "");
  const question = String(form.get("question") ?? "");

  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: "Missing audio" }, { status: 400 });
  if (audio.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Audio too large" }, { status: 413 });
  if (!transcript || transcript.length > 20000) return NextResponse.json({ error: "Invalid transcript" }, { status: 400 });
  if (!sessionId || !questionId) return NextResponse.json({ error: "sessionId and questionId required" }, { status: 400 });

  const bucket = await getBucket();
  const buf = Buffer.from(await audio.arrayBuffer());
  const fileId = await new Promise<unknown>((res, rej) => {
    const up = bucket.openUploadStream(`${sessionId}-${questionId}`, {
      metadata: { contentType: audio.type || "audio/webm" },
    });
    up.on("finish", () => res(up.id)).on("error", rej).end(buf);
  });

  const { insertedId } = await (await getDb()).collection("answers").insertOne({
    sessionId, questionId, question,
    audioFileId: fileId,
    transcript,
    asrEngine: "ollama-live",
    processingStatus: "completed",
    createdAt: new Date(),
    processedAt: new Date(),
  });

  return NextResponse.json({ id: insertedId, status: "completed" });
}
