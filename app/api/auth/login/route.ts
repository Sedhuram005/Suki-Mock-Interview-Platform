import { NextResponse } from "next/server";
import { MongoConfigurationError, withRetry } from "@/lib/dbConnect";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Retry the full DB operation up to 3× on transient Atlas failures
    const user = await withRetry(() =>
      User.findOne({ email: normalizedEmail })
    );

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 }
      );
    }

    if (user.password !== password) {
      return NextResponse.json(
        { error: "Invalid password. Please check your credentials." },
        { status: 401 }
      );
    }

    const userResponse = {
      id: user._id.toString(),
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      location: user.location,
      country: user.country,
      profession: user.profession,
      company: user.company,
      education: user.education,
      university: user.university,
      graduationYear: user.graduationYear,
      website: user.website,
      linkedin: user.linkedin,
      github: user.github,
      bio: user.bio,
      skills: user.skills,
      createdAt: user.createdAt,
    };

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user: userResponse,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const isMongoConfigurationError = error instanceof MongoConfigurationError;
    if (isMongoConfigurationError) {
      console.error("Login unavailable: MONGODB_URI is missing or invalid.");
      return NextResponse.json(
        {
          error:
            "Sign-in is unavailable because the database is not configured. Set MONGODB_URI in .env.local to a URI starting with mongodb:// or mongodb+srv://, then restart the app.",
        },
        { status: 503 },
      );
    }

    console.error("Login error:", error);
    const isConnectionError =
      error instanceof Error &&
      (error.name === "MongooseServerSelectionError" ||
        message.includes("Server selection timed out"));
    return NextResponse.json(
      {
        error: isConnectionError
          ? "Database temporarily unavailable. Please try again in a moment."
          : message || "Failed to log in.",
      },
      { status: 500 }
    );
  }
}
