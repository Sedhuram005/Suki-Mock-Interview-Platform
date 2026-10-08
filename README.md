# Mock Interview Platform

A Next.js App Router and MongoDB application for recording interview answers, showing live English captions, scoring answers with Ollama, and completing a React quiz.

## Features

- Microphone and camera permission checks with a live preview.
- Audio and video recording with a microphone level meter, playback, and download controls.
- The original audio and video for each answer are stored in MongoDB GridFS.
- English browser speech recognition provides live captions while the microphone and camera recording continue. When browser dictation is unavailable, the complete audio is transcribed once by the local faster-whisper service after recording. No translation is used.
- Ollama scores saved transcripts sequentially after the final answer.
- A four-question interview flow with progress indication.
- A 20-question React multiple-choice quiz follows the interview; selected answers and the server-calculated score are saved to the same MongoDB interview record.
- **Data Detective** at `/data-detective` accepts CSV uploads, streams analysis progress from the OpenAI Agents API, runs Python in an OpenAI-hosted sandbox, and returns charts plus a downloadable Markdown findings report.

## Setup

1. Install JavaScript dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `MONGODB_URI`. For the fallback transcription service, install dependencies from `speech-service` with `pip install -r requirements.txt`, then start it with `.\start.ps1` and wait for `SELF-TEST OK`. The default `fast` English profile is quickest; `-Profile balanced` or `-Profile accurate` use larger models and take longer. Start Ollama and make sure `qwen3:8b` is available for scoring. Keep `OPENAI_API_KEY` only if you use the separate Data Detective feature.
3. Start the app with `npm run dev`. The speech service listens on `127.0.0.1:8000`; keep `SPEECH_SERVICE_URL` and `NEXT_PUBLIC_SPEECH_URL` pointed at that address.

Never commit `.env.local` or share its connection string or tokens. Environment files are ignored by git.

## Data Detective

Open [http://localhost:3000/data-detective](http://localhost:3000/data-detective), upload a CSV up to 5 MB, and ask a question. The sample retail dataset is available in the app for a quick first run. Each analysis uses a persistent Agents API session, so follow-up questions continue with the same dataset. The server streams agent progress and serves generated report and chart artifacts; the OpenAI API key is never sent to the browser. Uploaded CSVs are mounted into an OpenAI-hosted sandbox with outbound network access disabled.

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

The client submits multipart form data with `interviewId`, `questionId`, `questionText`, `isLast`, the original `audio`, and `video`. It also sends the completed English transcript or a 16 kHz mono WAV `speechAudio` for final local transcription. Original audio and video bytes are stored in separate GridFS buckets and referenced from the answer document. Speech recognition is configured for English and rejects detected non-English speech.

Success response (`200`):

```json
{ "ok": true, "status": "In Progress", "transcript": "...", "asrEngine": "faster-whisper-en", "evaluationStatus": "pending" }
```

The status becomes `Interactive Assessment Complete` after the last spoken answer is transcribed and saved. It becomes `Completed` only after the candidate submits the React quiz and both assessment stages are finalized. Errors include `400` for an invalid payload, `409` for a missing/completed session or duplicate answer, `413` for an oversized recording, `422` for non-English or unclear/too-short speech, and `503` when MongoDB or the local speech service is unavailable.

### `GET /api/interview/results?interviewId=...&questionId=...`

Returns saved answers, English transcripts, background evaluation status and scores, and original audio/video URLs. `questionId` filters the response to one answer; omitting it returns all answers. Legacy transcript fields are used only as a compatibility fallback for older records.

### `POST /api/interview/evaluate-answer`

Starts background scoring for one saved English transcript with local `qwen3:8b`. The request is sent separately from transcription so it does not delay the next assessment question.

### `POST /api/interview/evaluate-pending`

Scores the saved transcripts sequentially after the interactive assessment is complete.

### `POST /api/interview/warmup`

Warms the configured Ollama model when requested. The live and final speech models are loaded by the separate speech-service process.

### `GET/POST /api/interview/react-quiz`

Returns the 20 React multiple-choice questions and any saved selections after the interactive assessment is completed. `POST` with `action: "save"` persists the question, options, and selected answer; `action: "submit"` validates all answers, calculates the score on the server, stores the correct and selected answer details, and marks both assessment stages as completed in MongoDB.

### `GET /api/interview/audio/[fileId]`

Streams the original audio recording from the `interviewAudio` GridFS bucket for playback.

### `GET /api/interview/video/[fileId]`

Streams the corresponding recorded video from MongoDB GridFS for playback in the interview results.

## Design Notes

- **Connection caching:** Mongoose is cached on `global` so development hot reloads and warm serverless invocations reuse the connection pool. Failed connection attempts clear the cached promise so later requests can retry.
- **Media storage:** Audio and video are stored in GridFS, with MIME types and file IDs on each answer. Legacy answers that contain Base64 audio remain readable. Each recording stops after five minutes; the upload API enforces per-file size limits.
- **Speech recognition:** Browser dictation provides immediate English captions in supported browsers while the original audio and video continue recording. If browser dictation is unavailable, the complete recorded audio is transcribed once by the local faster-whisper service. Microphone noise suppression and automatic gain control are disabled to preserve speech detail. The original audio and video are saved to GridFS.
- **Answer scoring:** Per-answer scoring uses the saved English transcript and runs sequentially after the final answer, away from live recording.
- **Idempotent saves:** An atomic update rejects duplicate question IDs for the same interview.
- **React quiz:** Quiz questions and answer keys are evaluated on the server. Selected choices are saved to the interview record as the candidate progresses, and the final score is stored with its submission time.
- **Error handling:** Missing or denied microphone access has a user-facing message, database failures return a clean `503`, and the interview route has an error boundary.

## Checks

```bash
npm run lint
npm run build
```
