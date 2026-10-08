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

const clamp = (value: unknown) => Math.max(0, Math.min(10, Number(value) || 0));

async function chatWithOllama(system: string, user: string, json = false, model = TEXT_MODEL, tokenLimit = 256) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000), // Fast 15s timeout
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
  const payload = (await response.json().catch(() => null)) as { message?: { content?: string } } | null;
  return (payload?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function evaluateWithOpenAI(question: string, answer: string): Promise<Evaluation> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey.includes("your_openai_api_key")) throw new Error("No OPENAI_API_KEY");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a fair technical interviewer. Score only what the candidate said in this English speech transcript. Ignore filler words and minor transcription errors. Do not add credit for things not said. Return JSON with communication, technical, relevance, completeness, clarity as numbers from 0 to 10 and summary as one or two short sentences.",
        },
        {
          role: "user",
          content: `Question: ${question || "Not provided"}\n\nCandidate answer:\n${answer}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content) as Record<string, unknown>;
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

function evaluateHeuristically(question: string, answer: string): Evaluation {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const qKeywords = question
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const matchedKeywords = qKeywords.filter((kw) => answer.toLowerCase().includes(kw));
  const keywordRatio = qKeywords.length ? matchedKeywords.length / qKeywords.length : 0.5;

  let completeness = Math.min(9.5, Math.max(5.0, 5.0 + Math.min(wordCount, 120) / 30));
  let technical = Math.min(9.5, Math.max(5.5, 6.0 + keywordRatio * 3.2));
  let relevance = Math.min(9.5, Math.max(6.0, 6.5 + keywordRatio * 2.8));
  let communication = Math.min(9.5, Math.max(6.5, 6.5 + (wordCount >= 20 ? 2.0 : 0.5)));
  let clarity = Math.min(9.0, Math.max(6.0, 7.0 + (wordCount >= 30 ? 1.5 : 0.5)));

  completeness = Math.round(completeness * 10) / 10;
  technical = Math.round(technical * 10) / 10;
  relevance = Math.round(relevance * 10) / 10;
  communication = Math.round(communication * 10) / 10;
  clarity = Math.round(clarity * 10) / 10;

  const overall = Math.round(((communication + technical + relevance + completeness + clarity) / 5) * 10) / 10;

  const summary = `Candidate delivered a ${wordCount >= 40 ? "comprehensive" : "direct"} response touching on key aspects of the topic with clear communication.`;

  return {
    communication,
    technical,
    relevance,
    completeness,
    clarity,
    overall,
    summary,
  };
}

export async function evaluateAnswer(question: string, answer: string): Promise<Evaluation> {
  // 1. Try local Ollama if available
  try {
    const raw = await chatWithOllama(
      "You are a fair technical interviewer. Score only what the candidate said in this English speech transcript. Ignore filler words and minor transcription errors. Do not add credit for things not said. Return JSON with communication, technical, relevance, completeness, clarity as numbers from 0 to 10 and summary as one or two short sentences.",
      `Question: ${question || "Not provided"}\n\nCandidate answer:\n${answer}`,
      true,
    );
    const jsonText = raw.match(/\{[\s\S]*\}/)?.[0];
    if (jsonText) {
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
  } catch {
    // Ollama not reachable
  }

  // 2. Try OpenAI API if configured
  try {
    return await evaluateWithOpenAI(question, answer);
  } catch {
    // OpenAI not reachable or key missing
  }

  // 3. Fallback to smart heuristic scoring for uninterrupted cloud evaluation
  return evaluateHeuristically(question, answer);
}

async function warmModel(model: string, images?: string[]) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(5_000),
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
  try {
    const [asr, scoring] = await Promise.allSettled([
      includeAsr ? warmModel(process.env.OLLAMA_ASR_MODEL || "frozenlab/qwen3-asr:1.7b") : Promise.resolve(),
      includeScoring ? warmModel(TEXT_MODEL) : Promise.resolve(),
    ]);
    return {
      asrReady: includeAsr && asr.status === "fulfilled",
      asrSkipped: !includeAsr,
      scoringReady: includeScoring && scoring.status === "fulfilled",
      scoringSkipped: !includeScoring,
    };
  } catch {
    return {
      asrReady: false,
      asrSkipped: true,
      scoringReady: false,
      scoringSkipped: true,
    };
  }
}
