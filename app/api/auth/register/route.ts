import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      gender,
      location,
      country,
      profession,
      company,
      education,
      university,
      graduationYear,
      website,
      linkedin,
      github,
      bio,
      skills,
    } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "First name, last name, email, and password are required." },
        { status: 400 }
      );
    }

    await dbConnect();

    const normalizedEmail = email.toLowerCase().trim();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // Upsert or update user so testing multiple times updates gracefully
    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password, // In production hash with bcrypt
        phone: phone?.trim() || "",
        dateOfBirth: dateOfBirth || "",
        gender: gender || "",
        location: location?.trim() || "",
        country: country?.trim() || "",
        profession: profession?.trim() || "",
        company: company?.trim() || "",
        education: education?.trim() || "",
        university: university?.trim() || "",
        graduationYear: graduationYear || "",
        website: website?.trim() || "",
        linkedin: linkedin?.trim() || "",
        github: github?.trim() || "",
        bio: bio?.trim() || "",
        skills: skills?.trim() || "",
      },
      { new: true, upsert: true, runValidators: true }
    );

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
      message: "Candidate registered and stored in database successfully.",
      user: userResponse,
    });
  } catch (error: unknown) {
    console.error("Registration error:", error);
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: message || "Failed to register candidate in database." },
      { status: 500 }
    );
  }
}
