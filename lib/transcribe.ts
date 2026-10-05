export type EnglishTranslation = {
  englishText: string;
  language: string;
  confidence: number | null;
  needsReview: boolean;
};

const DEFAULT_LOCAL_WHISPER_URL = "http://127.0.0.1:8765";
const TRANSLATION_TIMEOUT_MS = 5 * 60 * 1000;

const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/aac": "aac",
  "audio/flac": "flac",
  "audio/mp3": "mp3",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/x-m4a": "m4a",
  "audio/x-wav": "wav",
};

function getExtension(mimeType: string) {
  return AUDIO_EXTENSIONS[mimeType.split(";", 1)[0].trim().toLowerCase()] ?? "webm";
}

function serviceError(status: number, detail: unknown) {
  if (status === 401) return "Local Whisper token does not match. Check LOCAL_WHISPER_TOKEN in both terminals.";
  if (status === 503) return typeof detail === "string" ? detail : "Local Whisper could not process this recording.";
  if (status === 415 || status === 422 || status === 413) {
    return typeof detail === "string" ? detail : "The audio format or recording could not be processed.";
  }
  return "Local Whisper request failed. Check that the speech service is running.";
}

export async function transcribeAndTranslate(
  audio: Uint8Array | string,
  mimeType: string,
): Promise<EnglishTranslation> {
  const audioBytes = typeof audio === "string" ? Buffer.from(audio, "base64") : Buffer.from(audio);
  if (!audioBytes.length) throw new Error("Stored audio is empty.");

  const contentType = mimeType || "audio/webm";
  const normalizedType = contentType.split(";", 1)[0].trim().toLowerCase();
  if (!AUDIO_EXTENSIONS[normalizedType]) {
    throw new Error(`Unsupported recording format (${normalizedType || "unknown"}).`);
  }

  const form = new FormData();
  const audioBlob = new Blob([new Uint8Array(audioBytes).buffer as ArrayBuffer], { type: contentType });
  form.append("file", audioBlob, `answer.${getExtension(contentType)}`);

  const localUrl = (process.env.LOCAL_WHISPER_URL || DEFAULT_LOCAL_WHISPER_URL).replace(/\/+$/, "");
  const token = process.env.LOCAL_WHISPER_TOKEN;
  const headers = token ? { "x-local-whisper-token": token } : undefined;
  let response: Response;

  try {
    response = await fetch(`${localUrl}/translate`, {
      method: "POST",
      headers,
      body: form,
      signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Local English translation timed out. Keep the Whisper service running and retry.");
    }
    throw new Error("Local Whisper service is unavailable. Start it with the setup commands in README.md.");
  }

  const payload = await response.json().catch(() => ({})) as {
    detail?: unknown;
    englishText?: unknown;
    language?: unknown;
    confidence?: unknown;
    needsReview?: unknown;
  };
  if (!response.ok) throw new Error(serviceError(response.status, payload.detail));

  const englishText = typeof payload.englishText === "string" ? payload.englishText.trim() : "";
  if (!englishText) throw new Error("Local Whisper returned an empty English translation.");

  return {
    englishText,
    language: typeof payload.language === "string" ? payload.language : "",
    confidence: typeof payload.confidence === "number" ? payload.confidence : null,
    needsReview: Boolean(payload.needsReview),
  };
}
