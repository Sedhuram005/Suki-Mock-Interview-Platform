import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import Interview from "@/models/Interview";

export async function POST(req: Request) {
  try {
    const { sessionName, device, userEmail, candidateName } = await req.json();
    if (typeof sessionName !== "string" || !sessionName.trim()) {
      return NextResponse.json({ error: "sessionName is required" }, { status: 400 });
    }

    // never trust client input: whitelist and cap every field
    const safeDevice =
      device && typeof device === "object"
        ? {
            label: String(device.label ?? "").slice(0, 200),
            sampleRate: Number.isFinite(device.sampleRate) ? device.sampleRate : undefined,
            channelCount: Number.isFinite(device.channelCount) ? device.channelCount : undefined,
            echoCancellation: typeof device.echoCancellation === "boolean" ? device.echoCancellation : undefined,
            cameraLabel: String(device.cameraLabel ?? "").slice(0, 200),
            cameraWidth: Number.isFinite(device.cameraWidth) ? device.cameraWidth : undefined,
            cameraHeight: Number.isFinite(device.cameraHeight) ? device.cameraHeight : undefined,
            cameraFrameRate: Number.isFinite(device.cameraFrameRate) ? device.cameraFrameRate : undefined,
            userAgent: String(device.userAgent ?? "").slice(0, 300),
          }
        : undefined;

    await dbConnect();
    const doc = await Interview.create({
      sessionName: sessionName.trim(),
      userEmail: typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "",
      candidateName: typeof candidateName === "string" ? candidateName.trim() : sessionName.trim(),
      device: safeDevice,
    });
    return NextResponse.json({ interviewId: doc._id.toString() }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database unavailable. Please try again." }, { status: 503 });
  }
}
