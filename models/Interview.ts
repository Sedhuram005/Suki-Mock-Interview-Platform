import { Schema, models, model } from "mongoose";

const AnswerSchema = new Schema(
  {
    questionId: { type: Number, required: true },
    questionText: { type: String, required: true },
    // audioBase64 is kept optional to read interviews saved before media moved to GridFS.
    audioBase64: { type: String, default: undefined },
    audioFileId: { type: Schema.Types.ObjectId, default: null },
    videoFileId: { type: Schema.Types.ObjectId, default: null },
    videoMimeType: { type: String, default: "video/webm" },
    transcript: { type: String, default: "" },
    mimeType: { type: String, default: "audio/webm" },
    originalText: { type: String, default: "" },
    englishText: { type: String, default: "" },
    language: { type: String, default: "" },
    confidence: { type: Number, default: null },
    needsReview: { type: Boolean, default: false },
      translationStatus: { type: String, enum: ["pending", "done", "needs_review", "failed"], default: "pending" },
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
    cameraLabel: String,
    cameraWidth: Number,
    cameraHeight: Number,
    cameraFrameRate: Number,
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
