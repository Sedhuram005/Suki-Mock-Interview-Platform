import mongoose from "mongoose";

declare global {
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}
const cached = (global.mongooseCache ??= { conn: null, promise: null });

export async function dbConnect() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) throw new Error("Please define MONGODB_URI in .env.local");

  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(mongodbUri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
