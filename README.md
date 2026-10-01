# Mock Interview Platform

A Next.js App Router and MongoDB application that records spoken interview answers and saves them to MongoDB Atlas.

## Features

- Microphone permission check with pending, granted, and denied states.
- Camera and microphone permission with a live preview during the interview. Each answer saves separate audio and video clips; audio is used for transcription and English translation.
- Audio/video recording with `MediaRecorder`, a live microphone level meter, and playback controls.
- Answers can be spoken in any language; the server detects the language and converts the answer to English with automated cross-checking. Low-confidence answers are flagged for human review.
- Four-question interview flow with progress indication.
- Original audio is saved to MongoDB before transcription or translation. English answers and review metadata are generated from the stored audio after submission.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `MONGODB_URI` to your MongoDB Atlas connection string. Include a database name such as `/mockinterview`.
3. Set `OPENAI_API_KEY` in `.env.local`; optionally set `TRANSLATE_MODEL`, `GOOGLE_TRANSLATE_API_KEY`, and comma-separated `RETRY_LANGUAGES` for low-confidence transcription retries. With no retry languages configured, Whisper auto-detects without a language restriction; Google cross-checking is skipped unless its key is configured.
4. Start the development server with `npm run dev` and open [http://localhost:3000](http://localhost:3000).

Never commit `.env.local` or share its connection string. Environment files are ignored by git.

## API

### `POST /api/interview/start`

Body:

```json
{ "sessionName": "Sedhu" }
```

Success response (`201`):

```json
{ "interviewId": "..." }
```

### `POST /api/interview/submit-answer`

The client submits multipart form data with `interviewId`, `questionId`, `questionText`, `isLast`, and separate `audio` and `video` files with their MIME types. Audio is stored in the answer document for transcription; video is stored in the `interviewVideos` GridFS bucket.

Success response (`200`):

```json
{ "ok": true, "status": "In Progress" }
```

The status is `Completed` after the final answer is saved. Errors include `400` for an invalid payload, `409` for a missing/completed session or duplicate answer, `413` for an oversized recording, and `503` when MongoDB is unavailable.

### `GET /api/interview/results?interviewId=...`

Transcribes the stored audio, detects the language, and returns English answers with `language`, `confidence`, `needsReview`, and `translationStatus`. Original-language text is excluded unless `includeOriginal=1` is supplied. Failed answers remain eligible for retry on a later request.

### `GET /api/interview/video/[fileId]`

Streams the corresponding recorded video from MongoDB GridFS for playback in the interview results.

## Design Notes

- **Connection caching:** Mongoose is cached on `global` so development hot reloads and warm serverless invocations reuse the connection pool. Failed connection attempts clear the cached promise so later requests can retry.
- **Media storage:** Audio is stored as Base64 in each answer document. Camera video is stored in MongoDB GridFS and referenced by ID, keeping large clips out of the 16 MB interview document limit. Each recording stops after five minutes; the upload API enforces per-file size limits.
- **Translation:** The server transcribes saved audio, auto-detects the language, and generates English output. Low-confidence results and conflicting translation drafts are marked for review. Source transcripts remain in MongoDB for audit but are not returned by default.
- **Idempotent saves:** An atomic update rejects duplicate question IDs for the same interview.
- **Error handling:** Missing or denied microphone access has a user-facing message, database failures return a clean `503`, and the interview route has an error boundary.

## Checks

```bash
npm run lint
npm run build
```