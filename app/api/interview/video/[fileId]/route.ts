import { Readable } from "node:stream";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;
    if (!mongoose.isValidObjectId(fileId)) {
      return Response.json({ error: "Valid video file ID is required" }, { status: 400 });
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection is not ready.");

    const objectId = new mongoose.Types.ObjectId(fileId);
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "interviewVideos" });
    const file = await bucket.find({ _id: objectId }).next();
    if (!file) return Response.json({ error: "Video not found" }, { status: 404 });

    const videoStream = bucket.openDownloadStream(objectId);
    return new Response(Readable.toWeb(videoStream) as ReadableStream, {
      headers: {
        "Content-Type": String(file.metadata?.contentType ?? "video/webm"),
        "Content-Length": String(file.length),
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Video retrieval failed", error);
    return Response.json({ error: "Could not load interview video." }, { status: 503 });
  }
}