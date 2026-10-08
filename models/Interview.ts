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
    mimeType: { type: String, default: "audio/webm" },
    // Legacy transcript fields are retained so older interview records remain readable.
    draftEnglishText: { type: String, default: "" },
    englishText: { type: String, default: "" },
    humanVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    transcript: { type: String, default: "" },
    asrEngine: { type: String, default: "" },
    transcriptionStatus: { type: String, enum: ["completed", "failed"], default: undefined },
    processedAt: { type: Date, default: null },
    evaluation: {
      communication: { type: Number, min: 0, max: 10 },
      technical: { type: Number, min: 0, max: 10 },
      relevance: { type: Number, min: 0, max: 10 },
      completeness: { type: Number, min: 0, max: 10 },
      clarity: { type: Number, min: 0, max: 10 },
      overall: { type: Number, min: 0, max: 10 },
      summary: { type: String, default: "" },
    },
    evaluationStatus: { type: String, enum: ["pending", "processing", "completed", "failed"], default: undefined },
    evaluatedAt: { type: Date, default: null },
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

const ReactQuizAnswerSchema = new Schema(
  {
    questionId: { type: Number, required: true },
    questionText: { type: String, required: true },
    options: { type: [String], required: true },
    selectedOption: { type: Number, min: 0, max: 3, required: true },
    selectedText: { type: String, required: true },
    correctOption: { type: Number, min: 0, max: 3, required: true },
    correctText: { type: String, required: true },
    isCorrect: { type: Boolean, default: undefined },
  },
  { _id: false },
);

const ReactQuizVideoChunkSchema = new Schema(
  {
    index: { type: Number, required: true, min: 0 },
    fileId: { type: Schema.Types.ObjectId, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const ReactQuizSchema = new Schema(
  {
    answers: { type: [ReactQuizAnswerSchema], default: [] },
    score: { type: Number, min: 0, default: null },
    submittedAt: { type: Date, default: null },
    videoRecordingId: { type: Schema.Types.ObjectId, default: null },
    videoChunks: { type: [ReactQuizVideoChunkSchema], default: [] },
    videoFileId: { type: Schema.Types.ObjectId, default: null },
    videoMimeType: { type: String, default: "video/webm" },
    videoDurationMs: { type: Number, min: 0, default: null },
  },
  { _id: false },
);

const InterviewSchema = new Schema(
  {
    sessionName: { type: String, required: true, trim: true },
    userEmail: { type: String, lowercase: true, trim: true, default: "" },
    candidateName: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["In Progress", "Interactive Assessment Complete", "Completed"], default: "In Progress" },
    device: { type: DeviceSchema, default: undefined },
    answers: { type: [AnswerSchema], default: [] },
    reactQuiz: { type: ReactQuizSchema, default: undefined },
  },
  { timestamps: true }
);

export default models.Interview || model("Interview", InterviewSchema);
