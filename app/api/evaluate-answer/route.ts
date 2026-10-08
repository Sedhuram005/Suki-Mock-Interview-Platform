import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { evaluateAnswer, withRetry } from "@/lib/ollama";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const answerId = body?.answerId;

    if (!answerId) {
      return NextResponse.json({ error: "answerId required" }, { status: 400 });
    }

    const db = await getDb();
    let queryId: any = answerId;
    try {
      if (typeof answerId === "string" && ObjectId.isValid(answerId)) {
        queryId = new ObjectId(answerId);
      }
    } catch {}

    const answerDoc = await db.collection("answers").findOne({ _id: queryId });
    if (!answerDoc) {
      return NextResponse.json({ error: "Answer not found" }, { status: 404 });
    }

    const questionText = answerDoc.question || "";
    const transcript = answerDoc.transcript || "";

    if (!transcript.trim()) {
      return NextResponse.json({ error: "No transcript available to score" }, { status: 400 });
    }

    await db.collection("answers").updateOne(
      { _id: queryId },
      { $set: { evaluationStatus: "processing" } }
    );

    try {
      const evaluation = await withRetry(() => evaluateAnswer(questionText, transcript));

      await db.collection("answers").updateOne(
        { _id: queryId },
        {
          $set: {
            evaluation,
            evaluationStatus: "completed",
            evaluatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({ ok: true, status: "completed", evaluation });
    } catch (evalErr: any) {
      console.error("Evaluation error during scoring:", evalErr);
      await db.collection("answers").updateOne(
        { _id: queryId },
        { $set: { evaluationStatus: "failed" } }
      );
      return NextResponse.json({ error: "Evaluation failed" }, { status: 502 });
    }
  } catch (err: any) {
    console.error("Evaluation request error:", err);
    return NextResponse.json({ error: err?.message || "Could not start scoring" }, { status: 500 });
  }
}
