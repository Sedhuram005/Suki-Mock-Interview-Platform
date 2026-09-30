import { Schema, models, model } from "mongoose";

const AnswerSchema = new Schema(
  {
    questionId: { type: Number, required: true },
    questionText: { type: String, required: true },
    audioBase64: { type: String, required: true },
    transcript: { type: String, default: "" },
    mimeType: { type: String, default: "audio/webm" },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DeviceSchema = new Schema(
  {
    label: String,
    sampleRate: Number,
    channelCount: Number,
    echoCancellation: Boolean,
    userAgent: String,
  },
  { _id: false }
);

const InterviewSchema = new Schema(
  {
    sessionName: { type: String, required: true, trim: true },
    userEmail: { type: String, lowercase: true, trim: true, default: "" },
    candidateName: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["In Progress", "Completed"], default: "In Progress" },
    device: { type: DeviceSchema, default: undefined },
    answers: { type: [AnswerSchema], default: [] },
  },
  { timestamps: true }
);

export default models.Interview || model("Interview", InterviewSchema);
