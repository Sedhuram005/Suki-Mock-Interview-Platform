import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";

export async function getDb() {
  const conn = await dbConnect();
  const db = conn.connection.db;
  if (!db) {
    throw new Error("MongoDB database instance not found.");
  }
  return db;
}

export async function getBucket(bucketName = "fs") {
  const conn = await dbConnect();
  const db = conn.connection.db;
  if (!db) {
    throw new Error("MongoDB database instance not found.");
  }
  return new mongoose.mongo.GridFSBucket(db, { bucketName });
}
