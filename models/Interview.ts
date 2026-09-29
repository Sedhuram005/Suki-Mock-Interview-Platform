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

const InterviewSchema = new Schema(
  {
    sessionName: { type: String, required: true, trim: true },
    status: { type: String, enum: ["In Progress", "Completed"], default: "In Progress" },
    answers: { type: [AnswerSchema], default: [] },
  },
  { timestamps: true }
);

export default models.Interview || model("Interview", InterviewSchema);
