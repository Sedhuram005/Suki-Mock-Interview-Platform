import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/models/Interview";

export async function POST(req: Request) {
  try {
    const { sessionName } = await req.json();
    if (typeof sessionName !== "string" || !sessionName.trim()) {
      return NextResponse.json({ error: "sessionName is required" }, { status: 400 });
    }
    await dbConnect();
    const doc = await Interview.create({ sessionName });
    return NextResponse.json({ interviewId: doc._id.toString() }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database unavailable. Please try again." }, { status: 503 });
  }
}
