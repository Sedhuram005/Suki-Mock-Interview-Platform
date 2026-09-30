import { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, default: "", trim: true },
    dateOfBirth: { type: String, default: "" },
    gender: { type: String, default: "" },
    location: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    profession: { type: String, default: "", trim: true },
    company: { type: String, default: "", trim: true },
    education: { type: String, default: "", trim: true },
    university: { type: String, default: "", trim: true },
    graduationYear: { type: String, default: "" },
    website: { type: String, default: "", trim: true },
    linkedin: { type: String, default: "", trim: true },
    github: { type: String, default: "", trim: true },
    bio: { type: String, default: "", trim: true },
    skills: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);
