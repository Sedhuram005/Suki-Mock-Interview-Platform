# Mock Interview Platform

A Next.js App Router and MongoDB application that records spoken interview answers and saves them to MongoDB Atlas.

## Features

- Microphone permission check with pending, granted, and denied states.
- Camera and microphone permission with a live preview during the interview. Each answer saves separate audio and video clips; audio is used for transcription and English translation.
- Audio/video recording with `MediaRecorder`, a live microphone level meter, and playback controls.
- Answers can be spoken in Whisper-supported languages; local multilingual faster-whisper translates them into English. Low-confidence answers are flagged for human review.
- Four-question interview flow with progress indication.
- Original audio and video are stored byte-for-byte in separate MongoDB GridFS buckets. English answers and review metadata are generated from saved audio on the local machine.
- **Data Detective** at `/data-detective` accepts CSV uploads, streams analysis progress from the OpenAI Agents API, runs Python in an OpenAI-hosted sandbox, and returns charts plus a downloadable Markdown findings report.

## Setup

1. Install JavaScript dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`, set `MONGODB_URI`, and set a private random `LOCAL_WHISPER_TOKEN`. Keep `OPENAI_API_KEY` only if you use the separate Data Detective feature.
3. Create and activate the local speech service environment, then install its dependencies:

   ```powershell
   py -3.10 -m venv .venv-whisper
   .\.venv-whisper\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   python -m pip install -r local_whisper\requirements.txt
   ```

4. Start the local Whisper service as described below, then start Next.js with `npm run dev` in a second terminal.

Never commit `.env.local` or share its connection string or tokens. Environment files are ignored by git.

## Local multilingual speech translation

The recorder sends separate audio and video files to Next.js. The server writes both original byte streams to GridFS (`interviewAudio` and `interviewVideos`), then the results route sends only the audio bytes to the local faster-whisper service with `task="translate"`. Whisper auto-detects the spoken language and returns English text; the English transcript and language/review metadata are saved in MongoDB. No paid API is used for speech processing.

The installed Ollama `gemma3:4b` model on this machine reports text completion and vision capabilities, not audio. The project therefore uses faster-whisper rather than asking Ollama to process audio. The multilingual `small` model is used with CPU int8 by default. Its model files download from Hugging Face the first time the service starts; after that, transcription runs locally. Faster-whisper decodes WebM/Opus through PyAV, so this setup does not require a system FFmpeg conversion step.

If the speech model flags a result as low-confidence, the app marks it `needs_review` and withholds it from the English transcript and TXT export. The original recording stays saved. For difficult audio, set `WHISPER_MODEL` to `medium` or `large-v3` before starting the local service; larger models need more memory and can run much slower on CPU. Retry the answer after the replacement model finishes downloading and starts.

**Terminal 1 — local speech service** (run from the project root, after activating `.venv-whisper`):

```powershell
$env:LOCAL_WHISPER_TOKEN = "the_same_random_token_from_.env.local"
$env:WHISPER_MODEL = "small"
$env:WHISPER_DEVICE = "cpu"
$env:WHISPER_COMPUTE_TYPE = "int8"
npm run local-whisper
```

**Terminal 2 — web app:**

```powershell
npm run dev
```

Set `LOCAL_WHISPER_URL=http://127.0.0.1:8765` and the same `LOCAL_WHISPER_TOKEN` in `.env.local`. Visit `http://localhost:3000`, record an answer in Tamil, Hindi, English, or another Whisper-supported language, submit it, and read the English transcript on the result screen. Whisper supports many languages, but recognition quality varies by language and recording quality.

To export one saved interview's original media and English-only transcript, run `npm run export:interview-media -- --interview-id <interview-id> --retranslate`. Successful translations are also saved back to that interview in MongoDB. The output folder contains the English transcript, original audio/video, and a manifest mapping files to answers; answers with no detected speech remain blank in the transcript and are marked for review.

Never commit `.env.local` or share its connection string or API key. Environment files are ignored by git.

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

The client submits multipart form data with `interviewId`, `questionId`, `questionText`, `isLast`, and separate `audio` and `video` files with their MIME types. Original audio and video bytes are stored in GridFS and referenced from the answer document.

Success response (`200`):

```json
{ "ok": true, "status": "In Progress" }
```

The status is `Completed` after the final answer is saved. Errors include `400` for an invalid payload, `409` for a missing/completed session or duplicate answer, `413` for an oversized recording, and `503` when MongoDB is unavailable.

### `GET /api/interview/results?interviewId=...&questionId=...`

Uses local faster-whisper to translate a pending answer's saved audio into English, stores the result, and returns `englishText`, `language`, `confidence`, `needsReview`, and `translationStatus`. `questionId` processes one answer; omitting it processes all pending answers. Original-language transcript text is not returned.

### `GET /api/interview/audio/[fileId]`

Streams the original audio recording from the `interviewAudio` GridFS bucket for playback.

### `GET /api/interview/video/[fileId]`

Streams the corresponding recorded video from MongoDB GridFS for playback in the interview results.

## Design Notes

- **Connection caching:** Mongoose is cached on `global` so development hot reloads and warm serverless invocations reuse the connection pool. Failed connection attempts clear the cached promise so later requests can retry.
- **Media storage:** Audio and video are stored in GridFS, with MIME types and file IDs on each answer. Legacy answers that contain Base64 audio remain readable. Each recording stops after five minutes; the upload API enforces per-file size limits.
- **Translation:** A local multilingual Whisper model uses its English translation task. The audio is never sent to OpenAI or Google. Low-confidence results are marked for review; failed translations leave the original media intact and can be retried.
- **Idempotent saves:** An atomic update rejects duplicate question IDs for the same interview.
- **Error handling:** Missing or denied microphone access has a user-facing message, database failures return a clean `503`, and the interview route has an error boundary.

## Checks

```bash
npm run lint
npm run build
```
