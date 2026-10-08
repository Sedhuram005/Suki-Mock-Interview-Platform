import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import { evaluateAnswer, withRetry } from "@/lib/ollama";
import Interview from "@/models/Interview";

export const runtime = "nodejs";
export const maxDuration = 180;

type Answer = { questionId: number; questionText: string; transcript?: string; evaluationStatus?: string };

export async function POST(req: Request) {
  let interviewId = "";
  let questionId = -1;

  try {
    const body = await req.json().catch(() => null);
    interviewId = typeof body?.interviewId === "string" ? body.interviewId : "";
    questionId = Number(body?.questionId);
    if (!mongoose.isValidObjectId(interviewId) || !Number.isInteger(questionId)) {
      return NextResponse.json({ error: "Valid interview and question IDs are required." }, { status: 400 });
    }

    await dbConnect();
    const interview = await Interview.findById(interviewId).select({ answers: 1 }).lean() as { answers?: Answer[] } | null;
    const answer = interview?.answers?.find((item) => item.questionId === questionId);
    if (!answer) return NextResponse.json({ error: "Interview answer not found." }, { status: 404 });
    if (!answer.transcript?.trim()) return NextResponse.json({ error: "No English transcript is available to score." }, { status: 409 });
    if (answer.evaluationStatus === "completed") return NextResponse.json({ ok: true, status: "completed" });
    if (answer.evaluationStatus === "processing") return NextResponse.json({ ok: true, status: "processing" }, { status: 202 });

    await Interview.updateOne(
      { _id: interviewId, "answers.questionId": questionId },
      { $set: { "answers.$.evaluationStatus": "processing" } },
    );

    try {
      const evaluation = await withRetry(() => evaluateAnswer(answer.questionText, answer.transcript!));
      await Interview.updateOne(
        { _id: interviewId, "answers.questionId": questionId },
        { $set: {
          "answers.$.evaluation": evaluation,
          "answers.$.evaluationStatus": "completed",
          "answers.$.evaluatedAt": new Date(),
        } },
      );
      return NextResponse.json({ ok: true, status: "completed", evaluation });
    } catch (error) {
      console.error("Interview answer evaluation failed", error);
      await Interview.updateOne(
        { _id: interviewId, "answers.questionId": questionId },
        { $set: { "answers.$.evaluationStatus": "failed" } },
      );
      return NextResponse.json({ error: "Background scoring could not be completed." }, { status: 502 });
    }
  } catch (error) {
    console.error("Interview evaluation request failed", error);
    return NextResponse.json({ error: "Could not start background scoring." }, { status: 503 });
  }
}
