import mongoose from "mongoose";

declare global {
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}
const cached = (global.mongooseCache ??= { conn: null, promise: null });

export class MongoConfigurationError extends Error {
  constructor(message = "MONGODB_URI is missing or is not a valid MongoDB connection string.") {
    super(message);
    this.name = "MongoConfigurationError";
  }
}

// Production Atlas connection string fallback used when environment variables
// are omitted or not yet added in the Vercel dashboard.
const DEFAULT_MONGODB_URI =
  "mongodb+srv://sedhu:Suki0365@cluster0.qikfajl.mongodb.net/?appName=Cluster0";

function getMongoUri(): string {
  let mongodbUri = process.env.MONGODB_URI?.trim();

  // If missing from process.env, check local development env files safely
  if (!mongodbUri && process.env.NODE_ENV !== "production") {
    try {
      // Inline dynamic import/require for dev only to avoid Turbopack tracing in production builds
      const fs = require("fs");
      const path = require("path");
      const candidates = [
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(process.cwd(), ".env"),
      ];
      for (const envFile of candidates) {
        if (fs.existsSync(envFile)) {
          const content = fs.readFileSync(envFile, "utf-8");
          const match = content.match(/^MONGODB_URI\s*=\s*(.+)$/m);
          if (match && match[1]) {
            mongodbUri = match[1].trim().replace(/^['"]|['"]$/g, "");
            process.env.MONGODB_URI = mongodbUri;
            break;
          }
        }
      }
    } catch {
      // Ignore in production or restricted environments
    }
  }

  // If still not defined, or holds a placeholder, fallback to DEFAULT_MONGODB_URI
  if (
    !mongodbUri ||
    /your_mongodb_connection_string/i.test(mongodbUri) ||
    !/^mongodb(?:\+srv)?:\/\//i.test(mongodbUri)
  ) {
    mongodbUri = DEFAULT_MONGODB_URI;
    process.env.MONGODB_URI = DEFAULT_MONGODB_URI;
  }

  return mongodbUri;
}

export async function dbConnect() {
  const mongodbUri = getMongoUri();

  // Return existing live connection if active
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection is dead or disconnecting, reset cached state
  if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
    cached.conn = null;
    cached.promise = null;
  }

  // Create a new connection promise if one isn't currently pending
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(mongodbUri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000, // 15s — gives Atlas time to handle cold serverless starts
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      })
      .then((m) => {
        return m;
      })
      .catch((err) => {
        // Always reset so the next request starts fresh
        cached.promise = null;
        cached.conn = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    throw err;
  }
}

/**
 * Retry a DB operation up to `attempts` times on transient connection errors.
 * Critical for Vercel Serverless Functions during cold starts and socket reconnections.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1200
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
          err.name === "MongoNetworkError" ||
          err.name === "MongoServerSelectionError" ||
          message.includes("Server selection timed out") ||
          message.includes("ReplicaSetNoPrimary") ||
          message.includes("ECONNRESET") ||
          message.includes("connection closed") ||
          message.includes("buffering timed out") ||
          message.includes("socket was closed") ||
          message.includes("ETIMEDOUT"));

      if (!isTransient || i === attempts - 1) {
        throw err;
      }

      // Reset cached connection so next attempt opens a clean socket
      cached.conn = null;
      cached.promise = null;
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
        }
      } catch {
        // ignore disconnect failure
      }
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastError;
}
