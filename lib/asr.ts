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

export async function transcribeAudio(wav: Buffer, options: AsrOptions = {}): Promise<AsrResult> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "answer.wav");
  form.append("mode", options.mode ?? "final");
  if (options.prompt?.trim()) form.append("prompt", options.prompt.trim().slice(0, 1000));

  const response = await fetch(SPEECH_URL + "/transcribe", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new AsrError(detail || "Speech service returned HTTP " + response.status + ".", response.status);
  }

  const result = (await response.json()) as { transcript?: string; text?: string };
  return {
    text: String(result.transcript ?? result.text ?? "").trim(),
    engine: "faster-whisper-en",
  };
}
