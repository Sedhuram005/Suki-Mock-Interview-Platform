import { NextResponse } from "next/server";
import { getDb, getBucket } from "@/lib/mongodb";
import { transcribeAudio } from "@/lib/asr";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const form = await req.formData();
  const audio = form.get("audio");
  const sessionId = String(form.get("sessionId") ?? "");
  const questionId = String(form.get("questionId") ?? "");
  const question = String(form.get("question") ?? "");

  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "Missing audio" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await audio.arrayBuffer());
    const asrResult = await transcribeAudio(buf);
    const transcript = asrResult.text;

    const bucket = await getBucket();
    const fileId = await new Promise<unknown>((res, rej) => {
      const up = bucket.openUploadStream(`${sessionId}-${questionId}`, {
        metadata: { contentType: audio.type || "audio/webm" },
        contentType: audio.type || "audio/webm",
      } as any);
      up.on("finish", () => res(up.id)).on("error", rej).end(buf);
    });

    const { insertedId } = await (await getDb()).collection("answers").insertOne({
      sessionId,
      questionId,
      question,
      audioFileId: fileId,
      transcript,
      asrEngine: asrResult.engine || "ollama-batch",
      processingStatus: "completed",
      createdAt: new Date(),
      processedAt: new Date(),
    });

    return NextResponse.json({ id: insertedId, transcript, status: "completed" });
  } catch (err: any) {
    console.error("process-answer failed:", err);
    return NextResponse.json({ error: err?.message || "Processing failed" }, { status: 500 });
  }
}
