import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import { reactQuizQuestions } from "@/lib/reactQuizQuestions";
import Interview from "@/models/Interview";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_VIDEO_BYTES = 200_000_000;
const MAX_VIDEO_CHUNK_BYTES = 8_000_000;
const ALLOWED_VIDEO_TYPES = new Set(["video/webm", "video/mp4", "video/ogg", "video/quicktime"]);

type SavedQuizAnswer = { questionId: number; selectedOption: number };
type StoredVideoChunk = {
  index: number;
  fileId: mongoose.Types.ObjectId | string;
  contentType: string;
  size: number;
};
type QuizRecord = {
  answers?: SavedQuizAnswer[];
  score?: number | null;
  submittedAt?: Date | string | null;
  videoRecordingId?: mongoose.Types.ObjectId | string | null;
  videoChunks?: StoredVideoChunk[];
  videoFileId?: mongoose.Types.ObjectId | string | null;
  videoMimeType?: string | null;
  videoDurationMs?: number | null;
};

function isQuizId(value: unknown): value is string {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

function isFile(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== "string" && typeof value.arrayBuffer === "function";
}

function publicQuestions() {
  return reactQuizQuestions.map(({ id, question, options }) => ({ id, question, options: [...options] }));
}

function videoUrl(fileId?: mongoose.Types.ObjectId | string | null) {
  return fileId ? `/api/interview/video/${fileId.toString()}` : null;
}

function normalizedVideoType(file: File, fallback: unknown) {
  return (file.type || (typeof fallback === "string" ? fallback : "video/webm"))
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

function videoExtension(contentType: string) {
  return contentType === "video/mp4" ? "mp4" : contentType === "video/ogg" ? "ogv" : "webm";
}

async function deleteVideoChunks(chunks: StoredVideoChunk[]) {
  if (!chunks.length || !mongoose.connection.db) return;
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "interviewVideos" });
  await Promise.allSettled(
    chunks.map((chunk) => bucket.delete(new mongoose.Types.ObjectId(chunk.fileId))),
  );
}

async function uploadToGridFs(
  bucket: InstanceType<typeof mongoose.mongo.GridFSBucket>,
  fileId: mongoose.Types.ObjectId,
  filename: string,
  bytes: Buffer,
  metadata: Record<string, string | number>,
) {
  const stream = bucket.openUploadStreamWithId(fileId, filename, { metadata });
  await new Promise<void>((resolve, reject) => {
    stream.once("error", reject);
    stream.once("finish", resolve);
    stream.end(bytes);
  });
}

function parseSubmittedAnswers(value: unknown) {
  if (!Array.isArray(value) || value.length !== reactQuizQuestions.length) return null;
  const submittedAnswers = new Map<number, number>();
  for (const answer of value) {
    if (
      !answer ||
      !Number.isInteger(answer.questionId) ||
      !Number.isInteger(answer.selectedOption) ||
      submittedAnswers.has(answer.questionId)
    ) return null;
    const question = reactQuizQuestions.find((item) => item.id === answer.questionId);
    if (!question || answer.selectedOption < 0 || answer.selectedOption >= question.options.length) return null;
    submittedAnswers.set(answer.questionId, answer.selectedOption);
  }
  return reactQuizQuestions.every((question) => submittedAnswers.has(question.id)) ? submittedAnswers : null;
}

export async function GET(req: Request) {
  try {
    const interviewId = new URL(req.url).searchParams.get("interviewId");
    if (!isQuizId(interviewId)) {
      return NextResponse.json({ error: "A valid interviewId is required." }, { status: 400 });
    }

    await dbConnect();
    const interview = await Interview.findById(interviewId).select({ status: 1, reactQuiz: 1 }).lean() as
      | { status: string; reactQuiz?: QuizRecord }
      | null;
    if (!interview) return NextResponse.json({ error: "Interview not found." }, { status: 404 });
    if (interview.status !== "Interactive Assessment Complete" && interview.status !== "Completed") {
      return NextResponse.json({ error: "Finish the interactive assessment before starting the React quiz." }, { status: 409 });
    }

    return NextResponse.json({
      questions: publicQuestions(),
      answers: (interview.reactQuiz?.answers ?? []).map(({ questionId, selectedOption }) => ({ questionId, selectedOption })),
      score: interview.reactQuiz?.score ?? null,
      submittedAt: interview.reactQuiz?.submittedAt ?? null,
      videoUrl: videoUrl(interview.reactQuiz?.videoFileId),
    });
  } catch (error) {
    console.error("React quiz could not be loaded", error);
    return NextResponse.json({ error: "Could not load the React quiz." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  let bucket: InstanceType<typeof mongoose.mongo.GridFSBucket> | null = null;
  let uploadedVideoId: mongoose.Types.ObjectId | null = null;
  try {
    const isMultipart = req.headers.get("content-type")?.toLowerCase().includes("multipart/form-data") ?? false;
    let body: Record<string, unknown>;
    let videoFile: File | null = null;

    if (isMultipart) {
      const form = await req.formData();
      const answersField = form.get("answers");
      let answers: unknown = null;
      if (typeof answersField === "string") {
        try {
          answers = JSON.parse(answersField);
        } catch {
          return NextResponse.json({ error: "The submitted answers are invalid." }, { status: 400 });
        }
      }
      videoFile = isFile(form.get("video")) ? form.get("video") as File : null;
      body = {
        interviewId: form.get("interviewId"),
        action: form.get("action"),
        answers,
        recordingId: form.get("recordingId"),
        chunkIndex: Number(form.get("chunkIndex")),
        videoChunkCount: Number(form.get("videoChunkCount")),
        videoMimeType: form.get("videoMimeType"),
        videoDurationMs: Number(form.get("videoDurationMs")),
      };
    } else {
      const json = await req.json();
      if (!json || typeof json !== "object" || Array.isArray(json)) {
        return NextResponse.json({ error: "A valid quiz payload is required." }, { status: 400 });
      }
      body = json as Record<string, unknown>;
    }

    const interviewId = body.interviewId;
    const action = body.action;
    if (!isQuizId(interviewId)) {
      return NextResponse.json({ error: "A valid interviewId is required." }, { status: 400 });
    }
    if (action !== "save" && action !== "submit" && action !== "reset" && action !== "recording-start" && action !== "video-chunk") {
      return NextResponse.json({ error: "Choose a valid quiz action." }, { status: 400 });
    }
    if (isMultipart && action !== "submit" && action !== "video-chunk") {
      return NextResponse.json({ error: "Video upload is only accepted for quiz recording or final submission." }, { status: 400 });
    }
    if (!isMultipart && action === "video-chunk") {
      return NextResponse.json({ error: "A video chunk is required." }, { status: 400 });
    }

    await dbConnect();
    const baseFilter = {
      _id: interviewId,
      status: { $in: ["Interactive Assessment Complete", "Completed"] },
      "reactQuiz.submittedAt": null,
    };

    if (action === "recording-start") {
      if (isMultipart) return NextResponse.json({ error: "Choose a valid quiz action." }, { status: 400 });
      const existing = await Interview.findOne(baseFilter).select({ reactQuiz: 1 }).lean() as
        | { reactQuiz?: QuizRecord }
        | null;
      if (!existing) return NextResponse.json({ error: "The interview is not complete or the quiz was already submitted." }, { status: 409 });

      const recordingId = new mongoose.Types.ObjectId();
      const started = await Interview.updateOne(baseFilter, {
        $set: {
          "reactQuiz.videoRecordingId": recordingId,
          "reactQuiz.videoChunks": [],
          "reactQuiz.videoFileId": null,
          "reactQuiz.videoMimeType": "video/webm",
          "reactQuiz.videoDurationMs": null,
        },
      });
      if (started.matchedCount === 0) {
        return NextResponse.json({ error: "The interview is not complete or the quiz was already submitted." }, { status: 409 });
      }
      await deleteVideoChunks(existing.reactQuiz?.videoChunks ?? []);
      return NextResponse.json({ ok: true, recordingId: recordingId.toString() });
    }

    if (action === "reset") {
      const existing = await Interview.findOne(baseFilter).select({ reactQuiz: 1 }).lean() as
        | { reactQuiz?: QuizRecord }
        | null;
      const reset = await Interview.updateOne(baseFilter, {
        $set: {
          "reactQuiz.answers": [],
          "reactQuiz.score": null,
          "reactQuiz.submittedAt": null,
          "reactQuiz.videoRecordingId": null,
          "reactQuiz.videoChunks": [],
          "reactQuiz.videoFileId": null,
          "reactQuiz.videoMimeType": "video/webm",
          "reactQuiz.videoDurationMs": null,
        },
      });
      if (reset.matchedCount === 0) {
        return NextResponse.json({ error: "This quiz has already been submitted or the interview is not complete." }, { status: 409 });
      }
      await deleteVideoChunks(existing?.reactQuiz?.videoChunks ?? []);
      return NextResponse.json({ ok: true, reset: true });
    }

    if (action === "video-chunk") {
      const recordingId = body.recordingId;
      const chunkIndex = Number(body.chunkIndex);
      if (!isMultipart || !isFile(videoFile) || !isQuizId(recordingId) || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
        return NextResponse.json({ error: "A valid quiz recording chunk is required." }, { status: 400 });
      }
      const contentType = normalizedVideoType(videoFile, body.videoMimeType);
      if (!ALLOWED_VIDEO_TYPES.has(contentType)) {
        return NextResponse.json({ error: "Unsupported camera recording format." }, { status: 415 });
      }
      if (videoFile.size < 1 || videoFile.size > MAX_VIDEO_CHUNK_BYTES) {
        return NextResponse.json({ error: "A recording segment is empty or too large to save." }, { status: 413 });
      }

      const recordingFilter = { ...baseFilter, "reactQuiz.videoRecordingId": recordingId };
      const alreadySaved = await Interview.exists({ ...recordingFilter, "reactQuiz.videoChunks.index": chunkIndex });
      if (alreadySaved) return NextResponse.json({ ok: true, saved: true, chunkIndex });

      const bytes = Buffer.from(await videoFile.arrayBuffer());
      if (!bytes.length) return NextResponse.json({ error: "The camera recording segment is empty." }, { status: 400 });
      const db = mongoose.connection.db;
      if (!db) throw new Error("MongoDB connection is not ready.");
      bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "interviewVideos" });
      uploadedVideoId = new mongoose.Types.ObjectId();
      await uploadToGridFs(
        bucket,
        uploadedVideoId,
        `interview-${interviewId}-react-quiz-${recordingId}-${chunkIndex}.${videoExtension(contentType)}`,
        bytes,
        { interviewId, kind: "react-mcq-quiz-chunk", contentType, chunkIndex },
      );

      const saved = await Interview.updateOne(
        { ...recordingFilter, "reactQuiz.videoChunks.index": { $ne: chunkIndex } },
        {
          $push: {
            "reactQuiz.videoChunks": {
              index: chunkIndex,
              fileId: uploadedVideoId,
              contentType,
              size: bytes.length,
            },
          },
        },
      );
      if (saved.matchedCount === 0) {
        await bucket.delete(uploadedVideoId).catch(() => undefined);
        uploadedVideoId = null;
        const duplicate = await Interview.exists({ ...recordingFilter, "reactQuiz.videoChunks.index": chunkIndex });
        if (duplicate) return NextResponse.json({ ok: true, saved: true, chunkIndex });
        return NextResponse.json({ error: "The quiz recording changed. Restart the camera before continuing." }, { status: 409 });
      }

      uploadedVideoId = null;
      return NextResponse.json({ ok: true, saved: true, chunkIndex });
    }

    if (action === "save") {
      if (isMultipart) return NextResponse.json({ error: "Choose a valid quiz action." }, { status: 400 });
      const questionId = Number(body.questionId);
      const selectedOption = Number(body.selectedOption);
      const question = reactQuizQuestions.find((item) => item.id === questionId);
      if (!question || !Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption >= question.options.length) {
        return NextResponse.json({ error: "Choose one of the listed answers." }, { status: 400 });
      }
      const answerDetails = {
        questionText: question.question,
        options: [...question.options],
        selectedOption,
        selectedText: question.options[selectedOption],
        correctOption: question.correctOption,
        correctText: question.options[question.correctOption],
      };

      const existingAnswer = await Interview.updateOne(
        { ...baseFilter, "reactQuiz.answers.questionId": questionId },
        {
          $set: Object.fromEntries(
            Object.entries(answerDetails).map(([field, value]) => [`reactQuiz.answers.$.${field}`, value]),
          ),
        },
      );
      if (existingAnswer.matchedCount === 0) {
        const insertedAnswer = await Interview.updateOne(
          { ...baseFilter, "reactQuiz.answers.questionId": { $ne: questionId } },
          { $push: { "reactQuiz.answers": { questionId, ...answerDetails } } },
        );
        if (insertedAnswer.matchedCount === 0) {
          return NextResponse.json({ error: "This quiz has already been submitted or the interview is not complete." }, { status: 409 });
        }
      }

      return NextResponse.json({ ok: true, saved: true });
    }

    const submittedAnswers = parseSubmittedAnswers(body.answers);
    if (!submittedAnswers) {
      return NextResponse.json({ error: "Answer all 20 questions with valid options before submitting the quiz." }, { status: 400 });
    }
    if (!isMultipart || !videoFile) {
      return NextResponse.json({ error: "A complete camera recording is required to submit the React quiz." }, { status: 400 });
    }

    const recordingId = body.recordingId;
    const videoChunkCount = Number(body.videoChunkCount);
    if (!isQuizId(recordingId) || !Number.isInteger(videoChunkCount) || videoChunkCount < 1) {
      return NextResponse.json({ error: "The complete camera recording has not been saved yet." }, { status: 409 });
    }

    const videoMimeType = normalizedVideoType(videoFile, body.videoMimeType);
    if (!ALLOWED_VIDEO_TYPES.has(videoMimeType)) {
      return NextResponse.json({ error: "Unsupported camera recording format. Use a browser that records WebM or MP4 video." }, { status: 415 });
    }
    if (videoFile.size === 0 || videoFile.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "The camera recording is empty or exceeds the 200 MB limit." }, { status: 413 });
    }
    const videoDurationMs = Number(body.videoDurationMs);
    if (!Number.isFinite(videoDurationMs) || videoDurationMs < 1) {
      return NextResponse.json({ error: "The camera recording duration is invalid." }, { status: 400 });
    }

    const previousAttempt = await Interview.findById(interviewId).select({ status: 1, reactQuiz: 1 }).lean() as
      | { status: string; reactQuiz?: QuizRecord }
      | null;
    if (previousAttempt?.status === "Completed" && previousAttempt.reactQuiz?.submittedAt) {
      return NextResponse.json({
        ok: true,
        score: previousAttempt.reactQuiz.score ?? 0,
        total: reactQuizQuestions.length,
        submittedAt: previousAttempt.reactQuiz.submittedAt,
        videoUrl: videoUrl(previousAttempt.reactQuiz.videoFileId),
      });
    }

    const currentRecording = await Interview.findOne({ ...baseFilter, "reactQuiz.videoRecordingId": recordingId })
      .select({ reactQuiz: 1 })
      .lean() as { reactQuiz?: QuizRecord } | null;
    if (!currentRecording) {
      return NextResponse.json({ error: "The camera recording session expired. Restart the quiz recording before submitting." }, { status: 409 });
    }
    const storedChunks = currentRecording.reactQuiz?.videoChunks ?? [];
    const hasEveryChunk = storedChunks.length === videoChunkCount &&
      Array.from({ length: videoChunkCount }, (_, index) => index).every((index) => storedChunks.some((chunk) => chunk.index === index));
    if (!hasEveryChunk) {
      return NextResponse.json({ error: "Some camera video is still being saved. Wait for the recording status to finish, then submit again." }, { status: 409 });
    }

    const score = reactQuizQuestions.reduce(
      (total, question) => total + Number(submittedAnswers.get(question.id) === question.correctOption),
      0,
    );
    const savedAnswers = reactQuizQuestions.map((question) => {
      const selectedOption = submittedAnswers.get(question.id)!;
      return {
        questionId: question.id,
        questionText: question.question,
        options: [...question.options],
        selectedOption,
        selectedText: question.options[selectedOption],
        correctOption: question.correctOption,
        correctText: question.options[question.correctOption],
        isCorrect: selectedOption === question.correctOption,
      };
    });
    const bytes = Buffer.from(await videoFile.arrayBuffer());
    if (!bytes.length) return NextResponse.json({ error: "The camera recording is empty." }, { status: 400 });

    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection is not ready.");
    bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "interviewVideos" });
    uploadedVideoId = new mongoose.Types.ObjectId();
    const extension = videoMimeType === "video/mp4" ? "mp4" : videoMimeType === "video/ogg" ? "ogv" : "webm";
    await uploadToGridFs(
      bucket,
      uploadedVideoId,
      `interview-${interviewId}-react-quiz.${extension}`,
      bytes,
      { interviewId, kind: "react-mcq-quiz", contentType: videoMimeType, durationMs: videoDurationMs },
    );

    const submittedAt = new Date();
    const update = await Interview.updateOne(baseFilter, {
      $set: {
        status: "Completed",
        "reactQuiz.answers": savedAnswers,
        "reactQuiz.score": score,
        "reactQuiz.submittedAt": submittedAt,
        "reactQuiz.videoRecordingId": null,
        "reactQuiz.videoChunks": [],
        "reactQuiz.videoFileId": uploadedVideoId,
        "reactQuiz.videoMimeType": videoMimeType,
        "reactQuiz.videoDurationMs": videoDurationMs,
      },
    });

    if (update.modifiedCount === 0) {
      await bucket.delete(uploadedVideoId);
      uploadedVideoId = null;
      const concurrentAttempt = await Interview.findById(interviewId).select({ status: 1, reactQuiz: 1 }).lean() as
        | { status: string; reactQuiz?: QuizRecord }
        | null;
      if (concurrentAttempt?.status === "Completed" && concurrentAttempt.reactQuiz?.submittedAt) {
        return NextResponse.json({
          ok: true,
          score: concurrentAttempt.reactQuiz.score ?? 0,
          total: reactQuizQuestions.length,
          submittedAt: concurrentAttempt.reactQuiz.submittedAt,
          videoUrl: videoUrl(concurrentAttempt.reactQuiz.videoFileId),
        });
      }
      return NextResponse.json({ error: "The interview is not complete or the quiz was already submitted." }, { status: 409 });
    }

    const savedVideoUrl = videoUrl(uploadedVideoId);
    await deleteVideoChunks(storedChunks);
    uploadedVideoId = null;
    return NextResponse.json({
      ok: true,
      score,
      total: reactQuizQuestions.length,
      submittedAt: submittedAt.toISOString(),
      videoUrl: savedVideoUrl,
    });
  } catch (error) {
    if (bucket && uploadedVideoId) await bucket.delete(uploadedVideoId).catch(() => undefined);
    console.error("React quiz submission failed", error);
    return NextResponse.json({ error: "Could not save your React quiz and recording. Please try again." }, { status: 503 });
  }
}
