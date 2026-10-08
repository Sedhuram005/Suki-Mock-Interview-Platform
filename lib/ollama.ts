const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
export const TEXT_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";
const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "30m";

export type Evaluation = {
  communication: number;
  technical: number;
  relevance: number;
  completeness: number;
  clarity: number;
  overall: number;
  summary: string;
};

export async function withRetry<T>(task: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw lastError;
}

async function chat(system: string, user: string, json = false, model = TEXT_MODEL, tokenLimit = 256) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      keep_alive: KEEP_ALIVE,
      ...(json ? { format: "json" } : {}),
      options: { temperature: 0, num_ctx: 4096, num_predict: tokenLimit },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Ollama request failed (${response.status}).`);
  const payload = await response.json().catch(() => null) as { message?: { content?: string } } | null;
  return (payload?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

const clamp = (value: unknown) => Math.max(0, Math.min(10, Number(value) || 0));

export async function evaluateAnswer(question: string, answer: string): Promise<Evaluation> {
  const raw = await chat(
    "You are a fair technical interviewer. Score only what the candidate said in this English speech transcript. Ignore filler words and minor transcription errors. Do not add credit for things not said. Return JSON with communication, technical, relevance, completeness, clarity as numbers from 0 to 10 and summary as one or two short sentences.",
    `Question: ${question || "Not provided"}\n\nCandidate answer:\n${answer}`,
    true,
  );
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) throw new Error("Ollama returned an invalid answer evaluation.");
  const parsed = JSON.parse(jsonText) as Record<string, unknown>;
  const scores = {
    communication: clamp(parsed.communication),
    technical: clamp(parsed.technical),
    relevance: clamp(parsed.relevance),
    completeness: clamp(parsed.completeness),
    clarity: clamp(parsed.clarity),
  };
  const overall = Math.round((Object.values(scores).reduce((sum, score) => sum + score, 0) / 5) * 10) / 10;
  return { ...scores, overall, summary: String(parsed.summary || "").slice(0, 600) };
}

async function warmModel(model: string, images?: string[]) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      keep_alive: KEEP_ALIVE,
      options: { temperature: 0, num_predict: 1 },
      messages: [{ role: "user", content: images ? "" : " ", ...(images ? { images } : {}) }],
    }),
  });
  if (!response.ok) throw new Error(`Ollama could not load model ${model}.`);
}

export async function warmupOllama(includeAsr = false, includeScoring = true) {
  const asrModel = process.env.OLLAMA_ASR_MODEL || "frozenlab/qwen3-asr:1.7b";
  let asrImages: string[] | undefined;
  if (includeAsr) {
    const wav = Buffer.alloc(44 + 1600);
    wav.write("RIFF", 0, "ascii");
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.write("WAVE", 8, "ascii");
    wav.write("fmt ", 12, "ascii");
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(16_000, 24);
    wav.writeUInt32LE(32_000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36, "ascii");
    wav.writeUInt32LE(wav.length - 44, 40);
    asrImages = [wav.toString("base64")];
  }
  const [asr, scoring] = await Promise.allSettled([
    includeAsr ? warmModel(asrModel, asrImages) : Promise.resolve(),
    includeScoring ? warmModel(TEXT_MODEL) : Promise.resolve(),
  ]);
  return {
    asrReady: includeAsr && asr.status === "fulfilled",
    asrSkipped: !includeAsr,
    scoringReady: includeScoring && scoring.status === "fulfilled",
    scoringSkipped: !includeScoring,
  };
}
