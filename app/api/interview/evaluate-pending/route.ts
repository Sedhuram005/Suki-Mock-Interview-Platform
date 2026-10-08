import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import { evaluateAnswer, withRetry } from "@/lib/ollama";
import Interview from "@/models/Interview";

export const runtime = "nodejs";
export const maxDuration = 300;

type Answer = {
  questionId: number;
  questionText: string;
  transcript?: string;
  evaluationStatus?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const interviewId = typeof body?.interviewId === "string" ? body.interviewId : "";
    if (!mongoose.isValidObjectId(interviewId)) {
      return NextResponse.json({ error: "Valid interviewId is required." }, { status: 400 });
    }

    await dbConnect();
    const interview = await Interview.findById(interviewId).select({ answers: 1 }).lean() as { answers?: Answer[] } | null;
    if (!interview) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

    let completed = 0;
    let failed = 0;
    for (const answer of interview.answers ?? []) {
      if (!answer.transcript?.trim() || answer.evaluationStatus === "completed" || answer.evaluationStatus === "processing") continue;

      const claim = await Interview.updateOne(
        {
          _id: interviewId,
          answers: {
            $elemMatch: {
              questionId: answer.questionId,
              evaluationStatus: { $nin: ["completed", "processing"] },
            },
          },
        },
        { $set: { "answers.$.evaluationStatus": "processing" } },
      );
      if (claim.modifiedCount === 0) continue;

      try {
        const evaluation = await withRetry(() => evaluateAnswer(answer.questionText, answer.transcript!));
        await Interview.updateOne(
          { _id: interviewId, "answers.questionId": answer.questionId },
          { $set: {
            "answers.$.evaluation": evaluation,
            "answers.$.evaluationStatus": "completed",
            "answers.$.evaluatedAt": new Date(),
          } },
        );
        completed += 1;
      } catch (error) {
        console.error(`Interview answer evaluation failed for question ${answer.questionId}`, error);
        await Interview.updateOne(
          { _id: interviewId, "answers.questionId": answer.questionId },
          { $set: { "answers.$.evaluationStatus": "failed" } },
        );
        failed += 1;
      }
    }

    return NextResponse.json({ ok: true, completed, failed });
  } catch (error) {
    console.error("Pending interview evaluations failed", error);
    return NextResponse.json({ error: "Could not score the saved answers." }, { status: 503 });
  }
}
