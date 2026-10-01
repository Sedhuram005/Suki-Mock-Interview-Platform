import mongoose from "mongoose";

declare global {
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}
const cached = (global.mongooseCache ??= { conn: null, promise: null });

export async function dbConnect() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) throw new Error("Please define MONGODB_URI in .env.local");

  // Return existing live connection
  if (cached.conn) return cached.conn;

  // Create a new connection promise if one isn't pending
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(mongodbUri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000, // 15s — gives Atlas time to wake cold clusters
        connectTimeoutMS: 15000,
        socketTimeoutMS: 30000,
      })
      .catch((err) => {
        // Always reset so next request retries from scratch
        cached.promise = null;
        cached.conn = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/**
 * Retry a DB operation up to `attempts` times on transient connection errors.
 * Usage: await withRetry(() => User.findOne({ email }))
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1500
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await dbConnect();
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const message = err instanceof Error ? err.message : "";
      const isTransient =
        err instanceof Error &&
        (err.name === "MongooseServerSelectionError" ||
          message.includes("Server selection timed out") ||
          message.includes("ReplicaSetNoPrimary") ||
          message.includes("ECONNRESET"));
      if (!isTransient || i === attempts - 1) throw err;
      // Reset cached connection so next attempt tries fresh
      cached.conn = null;
      cached.promise = null;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastError;
}

