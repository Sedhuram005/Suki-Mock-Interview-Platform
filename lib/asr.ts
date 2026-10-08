const SPEECH_URL = (process.env.SPEECH_SERVICE_URL || process.env.TRANSCRIBE_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export type AsrMode = "live" | "partial" | "final";
export type AsrResult = { text: string; engine: string };
export type AsrOptions = { mode?: AsrMode; prompt?: string };

export class AsrError extends Error {
  constructor(message: string, readonly statusCode: number = 400) {
    super(message);
    this.name = "AsrError";
  }
}

async function transcribeWithOpenAI(wav: Buffer, prompt?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey.includes("your_openai_api_key")) throw new Error("No OPENAI_API_KEY");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "answer.wav");
  form.append("model", "whisper-1");
  form.append("language", "en");
  if (prompt?.trim()) form.append("prompt", prompt.trim().slice(0, 1000));

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`OpenAI Whisper error (${response.status}): ${err}`);
  }

  const result = (await response.json()) as { text?: string };
  return String(result.text || "").trim();
}

export async function transcribeAudio(wav: Buffer, options: AsrOptions = {}): Promise<AsrResult> {
  // 1. Try local or custom Whisper server if available
  try {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "answer.wav");
    form.append("mode", options.mode ?? "final");
    if (options.prompt?.trim()) form.append("prompt", options.prompt.trim().slice(0, 1000));

    const response = await fetch(SPEECH_URL + "/transcribe", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(10_000), // Fast 10s timeout
    });

    if (response.ok) {
      const result = (await response.json()) as { transcript?: string; text?: string };
      return {
        text: String(result.transcript ?? result.text ?? "").trim(),
        engine: "faster-whisper-en",
      };
    }
  } catch {
    // Local speech service unreachable, fallback to cloud
  }

  // 2. Try OpenAI Whisper cloud service
  try {
    const openAiText = await transcribeWithOpenAI(wav, options.prompt);
    if (openAiText) {
      return {
        text: openAiText,
        engine: "openai-whisper-1",
      };
    }
  } catch {
    // OpenAI Whisper unavailable or key not set
  }

  // 3. Fallback gracefully so audio submission never crashes with HTTP 500
  return {
    text: "",
    engine: "browser-speech-recognition-en",
  };
}
