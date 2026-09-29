# Mock Interview Platform

A Next.js App Router and MongoDB application that records spoken interview answers and saves them to MongoDB Atlas.

## Features

- Microphone permission check with pending, granted, and denied states.
- Audio recording with `MediaRecorder`, a live microphone level meter, and playback controls.
- Optional live speech recognition with an editable transcript. Browsers without Web Speech API support can still record audio and enter a transcript manually.
- Four-question interview flow with progress indication.
- Answers saved to MongoDB; session status changes from `In Progress` to `Completed` after the final answer.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `MONGODB_URI` to your MongoDB Atlas connection string. Include a database name such as `/mockinterview`.
3. Start the development server with `npm run dev` and open [http://localhost:3000](http://localhost:3000).

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

Body fields: `interviewId`, `questionId`, `questionText`, `audioBase64`, `mimeType`, and `isLast`. `transcript` is optional and is saved with the answer when supplied.

Success response (`200`):

```json
{ "ok": true, "status": "In Progress" }
```

The status is `Completed` after the final answer is saved. Errors include `400` for an invalid payload, `409` for a missing/completed session or duplicate answer, `413` for an oversized recording, and `503` when MongoDB is unavailable.

## Design Notes

- **Connection caching:** Mongoose is cached on `global` so development hot reloads and warm serverless invocations reuse the connection pool. Failed connection attempts clear the cached promise so later requests can retry.
- **Audio storage:** Audio is stored as Base64 in each answer document. The recorder stops after five minutes, and the API rejects Base64 payloads above 4 MB. MongoDB documents are limited to 16 MB, so larger recordings should use GridFS or object storage such as S3 and store only a URL.
- **Transcripts:** When the browser supports the Web Speech API, recognized speech is shown for candidate review and correction. Transcript text is stored as an optional field in each answer; transcription is not required for audio submission.
- **Idempotent saves:** An atomic update rejects duplicate question IDs for the same interview.
- **Error handling:** Missing or denied microphone access has a user-facing message, database failures return a clean `503`, and the interview route has an error boundary.

## Checks

```bash
npm run lint
npm run build
```