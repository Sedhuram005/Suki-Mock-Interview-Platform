"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { concat, downsample, encodeWav, normalize } from "@/lib/pcm";

export type MicStatus = "idle" | "requesting" | "listening" | "finishing" | "denied" | "error";
// stable = confirmed words (never change), tail = newest words still being checked
// failed = this line couldn't be converted even after retries (shows Retry button)
export type Line = { id: number; at: number; stable: string; tail: string; done: boolean; failed?: boolean };

// ---- tuning ----
const SPLIT_MS = 650;         // natural pause that seals a sentence
const SOFT_MS = 4000;          // after 4s speech, a short pause can end a long line
const SOFT_GAP_MS = 280;
const MAX_SEG_MS = 8000;       // maximum segment length before cutting to keep latency low
const MIN_VOICED_MS = 150;     // allow short sentences
const MIN_PEAK = 0.005;        // sensitive to low and soft voice
const PREROLL_MS = 350;        // audio kept before speech starts
const PARTIAL_MIN_MS = 250;    // speech needed before the first live read
const PARTIAL_GROW_MS = 180;   // new audio needed before the next live read
const START_MIN = 0.005;       // voice threshold to start a line
const STAY_MIN = 0.002;        // lower bar to stay inside a line

const SPEECH_URL = process.env.NEXT_PUBLIC_SPEECH_URL;

const toWords = (t: string) => t.split(/\s+/).filter(Boolean);
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createBrowserRecognition(): any | null {
  if (typeof window === "undefined") return null;
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Recognition) return null;
  try {
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    return recognition;
  } catch {
    return null;
  }
}

function agreeLen(a: string[], b: string[]) {
  let i = 0;
  while (i < a.length && i < b.length && norm(a[i]) === norm(b[i])) i++;
  return i;
}
function prefixMatch(a: string[], b: string[]) {
  const n = Math.min(a.length, b.length);
  if (!n) return 1;
  let m = 0;
  for (let i = 0; i < n; i++) if (norm(a[i]) === norm(b[i])) m++;
  return m / n;
}
// ---- ASR helpers ----
async function post(
  url: string,
  field: "file" | "audio",
  wav: Blob,
  signal: AbortSignal,
  mode: "live" | "final",
  prompt: string,
): Promise<string> {
  const fd = new FormData();
  fd.append("mode", mode);
  if (prompt.trim()) fd.append("prompt", prompt.trim());
  fd.append(field, wav, "chunk.wav");
  const r = await fetch(url, { method: "POST", body: fd, signal });
  if (!r.ok) throw new Error(`speech ${r.status}`);
  const d = await r.json();
  return String(d.transcript ?? d.text ?? "").trim();
}

async function callAsr(wav: Blob, signal: AbortSignal, mode: "live" | "final", prompt: string): Promise<string> {
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const isLocalUrl = Boolean(SPEECH_URL && (SPEECH_URL.includes("127.0.0.1") || SPEECH_URL.includes("localhost")));
  // In HTTPS, never call an insecure HTTP localhost address to avoid mixed-content blocking
  if (SPEECH_URL && (!isHttps || !isLocalUrl)) {
    try { return await post(SPEECH_URL.replace(/\/+$/, "") + "/transcribe", "file", wav, signal, mode, prompt); }
    catch (e) {
      if ((e as any)?.name === "AbortError" || signal.aborted) throw e;
      // direct call failed: fall through to the Next.js proxy route
    }
  }
  return post("/api/transcribe-chunk", "audio", wav, signal, mode, prompt);
}

async function callWithRetry(
  wav: Blob,
  signal: AbortSignal,
  alive: () => boolean,
  mode: "live" | "final",
  prompt: string,
): Promise<string> {
  let err: unknown;
  for (let i = 0; i < 3; i++) {
    try { return await callAsr(wav, signal, mode, prompt); }
    catch (e) {
      err = e;
      if (signal.aborted || !alive()) throw e;
      await sleep(300 * (i + 1) ** 2); // 300 ms → 1.2 s → 2.7 s
    }
  }
  throw err;
}

async function speechUp(): Promise<boolean> {
  if (typeof window !== "undefined") {
    const isCloud = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
    const hasWebSpeech = Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (isCloud && hasWebSpeech) return true;
  }
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const isLocalUrl = Boolean(SPEECH_URL && (SPEECH_URL.includes("127.0.0.1") || SPEECH_URL.includes("localhost")));
  if (SPEECH_URL && (!isHttps || !isLocalUrl)) {
    try {
      const r = await fetch(`${SPEECH_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return true;
    } catch {}
  }
  try {
    const r = await fetch("/api/speech-health", { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const d = await r.json();
      return !!d.ok;
    }
  } catch {}
  return false;
}

async function makeContext(stream: MediaStream) {
  try {
    const c = new AudioContext({ sampleRate: 16000 });
    try { c.createMediaStreamSource(stream); return c; } catch { await c.close(); }
  } catch {}
  return new AudioContext();
}

/** resetKey: pass the current question id. When it changes everything is cleared. */
export function useDictation({
  resetKey,
  prompt = "",
  autoStopMs = 0,
}: { resetKey: string; prompt?: string; autoStopMs?: number }) {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [pending, setPending] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const sess = useRef<any>(null);
  const gen = useRef(0);
  const startingGen = useRef<number | null>(null);
  const fullRecordingFinalRef = useRef(false);
  const browserLiveRef = useRef(false);
  const browserTranscriptRef = useRef("");
  const linesRef = useRef<Line[]>([]);
  const nextId = useRef(1);
  const t0 = useRef<number | null>(null);
  const autoRef = useRef(autoStopMs); autoRef.current = autoStopMs;
  const stopRef = useRef<() => Promise<void>>(async () => {});
  // store failed WAV blobs so the Retry button can re-submit them
  const failedWavs = useRef(new Map<number, Blob>());
  const promptRef = useRef(prompt);
  useEffect(() => { promptRef.current = prompt; }, [prompt]);

  const commit = (next: Line[]) => { linesRef.current = next; setLines(next); };
  const upsert = useCallback((id: number, patch: Partial<Line>) => {
    const cur = linesRef.current;
    if (!cur.some((l) => l.id === id)) return;
    commit(cur.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);
  const removeLine = useCallback((id: number) => commit(linesRef.current.filter((l) => l.id !== id)), []);

  const teardown = useCallback(() => {
    gen.current++;
    startingGen.current = null;
    const st = sess.current;
    sess.current = null;
    if (st) {
      st.stopping = true;
      st.abort.abort();
      st.browserRecognition = false;
      try { st.recognition?.abort(); } catch {}
      try { st.node.disconnect(); } catch {}
      st.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      st.ctx.close().catch(() => {});
    }
  }, []);

  const reset = useCallback(() => {
    teardown();
    commit([]);
    t0.current = null;
    failedWavs.current.clear();
    fullRecordingFinalRef.current = false;
    browserLiveRef.current = false;
    browserTranscriptRef.current = "";
    setStatus("idle"); setSpeaking(false); setPending(0); setLevel(0); setError("");
  }, [teardown]);

  const start = useCallback(async (inputTrack?: MediaStreamTrack) => {
    if (sess.current || startingGen.current === gen.current) return;
    setError("");
    const myGen = gen.current;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("The microphone only works on HTTPS or localhost.");
      setStatus("error");
      return;
    }
    startingGen.current = myGen;
    // Keep local ASR off the live audio stream. Browser captions provide the
    // instant preview; one full recording pass is the fallback when unavailable.
    fullRecordingFinalRef.current = true;
    setStatus("requesting");

    // Probe ASR in the background so health checks never delay mic capture.
    const serviceCheck = speechUp();

    let stream: MediaStream;
    try {
      if (inputTrack?.readyState === "live") {
        // Reuse the active assessment mic source. Cloning gives dictation its own
        // stoppable track without opening a second microphone capture session.
        stream = new MediaStream([inputTrack.clone()]);
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
        });
      }
    } catch (e: any) {
      if (startingGen.current === myGen) startingGen.current = null;
      if (myGen !== gen.current) return;
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") setStatus("denied");
      else { setError("No microphone was found."); setStatus("error"); }
      return;
    }
    if (myGen !== gen.current) { if (startingGen.current === myGen) startingGen.current = null; stream.getTracks().forEach((t) => t.stop()); return; }

    let ctx: AudioContext | null = null;
    try {
      ctx = await makeContext(stream);
      await ctx.resume();
      await ctx.audioWorklet.addModule("/pcm-processor.js");
      if (myGen !== gen.current) {
        if (startingGen.current === myGen) startingGen.current = null;
        stream.getTracks().forEach((t) => t.stop());
        await ctx.close().catch(() => {});
        return;
      }
      const src = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, "pcm-processor");
      const mute = ctx.createGain();
      mute.gain.value = 0;
      src.connect(node); node.connect(mute); mute.connect(ctx.destination);
      if (t0.current === null) t0.current = performance.now();

      const st: any = {
        ctx, stream, node, rate: ctx.sampleRate, abort: new AbortController(),
        preroll: [] as Float32Array[], prerollMs: 0,
        seg: [] as Float32Array[], segMs: 0, voicedMs: 0, peak: 0,
        inSpeech: false, silenceMs: 0, idleMs: 0, heard: false, noise: 0.005,
        finals: new Set<Promise<void>>(), finalQueue: Promise.resolve(), stopping: false, lastLevelAt: 0,
        uttId: 0, token: 0, stable: [] as string[], prevHyp: null as string[] | null,
        hypSentMs: 0, lastSentMs: 0, partialBusy: false, partialPromise: Promise.resolve(),
        recognition: null, browserRecognition: false, browserSessionUsed: false,
        browserCommittedText: "", browserFinalText: "", browserInterimText: "", browserCaptionId: 0,
        browserStopped: null as Promise<void> | null, resolveBrowserStopped: null as (() => void) | null,
      };
      const alive = () => myGen === gen.current;

      const publishBrowserTranscript = () => {
        const stable = [st.browserCommittedText, st.browserFinalText].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
        const text = [stable, st.browserInterimText].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
        browserTranscriptRef.current = text;
        if (!text) return;
        if (!st.browserCaptionId) {
          st.browserCaptionId = nextId.current++;
          commit([...linesRef.current, {
            id: st.browserCaptionId,
            at: Math.max(0, (performance.now() - (t0.current ?? performance.now())) / 1000),
            stable: "", tail: "", done: false,
          }]);
        }
        upsert(st.browserCaptionId, { stable, tail: st.browserInterimText, done: false });
      };

      // Browser speech recognition for instant interim preview
      const recognition = createBrowserRecognition();
      if (recognition) {
        st.recognition = recognition;
        st.browserRecognition = true;
        st.browserStopped = new Promise<void>((resolve) => { st.resolveBrowserStopped = resolve; });
        recognition.onresult = (event: any) => {
          if (!alive()) return;
          const finalParts: string[] = [];
          const interimParts: string[] = [];
          for (let i = 0; i < event.results.length; ++i) {
            const text = String(event.results[i][0]?.transcript || "").replace(/\s+/g, " ").trim();
            if (!text) continue;
            (event.results[i].isFinal ? finalParts : interimParts).push(text);
          }
          st.browserFinalText = finalParts.join(" ");
          st.browserInterimText = interimParts.join(" ");
          publishBrowserTranscript();
        };
        recognition.onerror = (event: any) => {
          if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
            st.browserRecognition = false;
            browserLiveRef.current = false;
          }
        };
        recognition.onend = () => {
          if (!alive()) { st.resolveBrowserStopped?.(); return; }
          if (st.stopping) {
            st.browserCommittedText = [st.browserCommittedText, st.browserFinalText, st.browserInterimText].filter(Boolean).join(" ");
            st.browserFinalText = "";
            st.browserInterimText = "";
            publishBrowserTranscript();
            st.resolveBrowserStopped?.();
            return;
          }
          if (!st.browserRecognition) return;
          st.browserCommittedText = [st.browserCommittedText, st.browserFinalText, st.browserInterimText].filter(Boolean).join(" ");
          st.browserFinalText = "";
          st.browserInterimText = "";
          publishBrowserTranscript();
          window.setTimeout(() => {
            if (!st.browserRecognition || st.stopping || !alive()) return;
            try { recognition.start(); } catch { /* already restarting */ }
          }, 250);
        };
        try {
          recognition.start();
          st.browserSessionUsed = true;
          browserLiveRef.current = true;
        }
        catch { st.browserRecognition = false; st.recognition = null; st.browserStopped = null; }
      }

      // ---- live Whisper read running PARALLEL to the voice stream ----
      const runPartial = async () => {
        const token = st.token, uttId = st.uttId, sentMs = st.segMs;
        st.partialBusy = true;
        st.lastSentMs = sentMs;
        try {
          const wav = encodeWav(normalize(downsample(concat(st.seg), st.rate)));
          const text = await callAsr(wav, st.abort.signal, "live", promptRef.current);
          if (!alive() || token !== st.token) return;
          const hyp = toWords(text);
          if (!hyp.length) return;
          const stable: string[] = st.stable;
          const agree = st.prevHyp ? agreeLen(st.prevHyp, hyp) : 0;
          if (agree > stable.length) st.stable = [...stable, ...hyp.slice(stable.length, agree)];
          st.prevHyp = hyp;
          st.hypSentMs = sentMs;
          const stableText = st.stable.join(" ");
          const tailWords = hyp.slice(st.stable.length);
          const tailText = tailWords.length ? tailWords.join(" ") : "";
          upsert(uttId, {
            stable: stableText,
            tail: tailText || (stableText ? "" : text),
          });
        } catch {
          /* a failed live read is fine; next partial or flush will retry */
        } finally {
          st.partialBusy = false;
        }
      };

      // adaptive loop: continuously runs in parallel while speech is active
      (async () => {
        while (!st.stopping && alive()) {
          if (!fullRecordingFinalRef.current && st.inSpeech && !st.partialBusy && st.voicedMs >= PARTIAL_MIN_MS && st.segMs - st.lastSentMs >= PARTIAL_GROW_MS) {
            st.partialPromise = runPartial();
            await st.partialPromise;
          } else {
            await sleep(35);
          }
        }
      })();

      // ---- a pause ends the line ----
      const flush = () => {
        const keep = st.voicedMs >= MIN_VOICED_MS && st.peak >= MIN_PEAK;
        const pcm = concat(st.seg);
        const uttId = st.uttId;
        const S: string[] = st.stable;
        const previewAtFlush: Promise<void> = st.partialPromise;
        st.idleMs = st.silenceMs;
        st.seg = []; st.segMs = 0; st.voicedMs = 0; st.peak = 0;
        st.inSpeech = false; st.silenceMs = 0; st.preroll = []; st.prerollMs = 0;
        st.token++; st.stable = []; st.prevHyp = null; st.lastSentMs = 0; st.hypSentMs = 0;
        setSpeaking(false);

        if (fullRecordingFinalRef.current) return;
        if (!keep || pcm.length === 0) { removeLine(uttId); return; }
        // Keep browser captions as a live preview, then run one local final pass
        // over the full answer after stop. This preserves context and avoids a
        // per-sentence queue delaying the saved transcript.
        const wav = encodeWav(normalize(downsample(pcm, st.rate)));
        setPending((p) => p + 1);
        const job: Promise<void> = (st.finalQueue as Promise<void>).then(async () => {
          try {
            let t = "";
            try {
              // Avoid running the CPU-bound final model alongside this line's live preview request.
              await previewAtFlush;
              t = await callWithRetry(wav, st.abort.signal, alive, "final", promptRef.current);
            } catch {
              if (!alive()) return;
              if (S.length) {
                // keep the words already confirmed by the partial reads
                upsert(uttId, { stable: S.join(" "), tail: "", done: true });
              } else {
                // nothing confirmed yet — show a per-line Retry button
                failedWavs.current.set(uttId, wav);
                upsert(uttId, { stable: "", tail: "", done: true, failed: true });
              }
              return;
            }
            if (!alive()) return;
            const text = t.trim();
            if (text.trim()) upsert(uttId, { stable: text, tail: "", done: true });
            else if (S.length) upsert(uttId, { stable: S.join(" "), tail: "", done: true });
            else removeLine(uttId);
          } finally {
            setPending((p) => Math.max(0, p - 1));
          }
        });
        st.finalQueue = job.catch(() => {});
        st.finals.add(job);
        job.finally(() => st.finals.delete(job));
      };
      st.flush = flush;

      node.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (st.stopping || !alive()) return;
        const f = e.data;
        const ms = (f.length / st.rate) * 1000;

        let sum = 0;
        for (let i = 0; i < f.length; i++) sum += f[i] * f[i];
        const rms = Math.sqrt(sum / f.length);

        const startTh = Math.min(0.015, Math.max(START_MIN, st.noise * 2.2));
        const stayTh = Math.min(0.008, Math.max(STAY_MIN, st.noise * 1.4));
        const voice = st.inSpeech ? rms > stayTh : rms > startTh;
        if (rms < startTh) st.noise = Math.min(0.03, st.noise * 0.97 + rms * 0.03);
        if (st.inSpeech && rms > st.peak) st.peak = rms;

        const now = performance.now();
        if (now - st.lastLevelAt > 60) { st.lastLevelAt = now; setLevel(Math.min(1, rms * 9)); }

        if (!st.inSpeech) {
          if (voice) {
            st.inSpeech = true; st.heard = true; st.peak = rms;
            st.seg = [...st.preroll, f]; st.segMs = st.prerollMs + ms;
            st.voicedMs = ms; st.silenceMs = 0; st.idleMs = 0;
            st.token++; st.stable = []; st.prevHyp = null; st.lastSentMs = 0; st.hypSentMs = 0;
            st.uttId = fullRecordingFinalRef.current ? 0 : nextId.current++;
            if (!fullRecordingFinalRef.current) {
              commit([...linesRef.current, {
                id: st.uttId, at: (now - (t0.current ?? now)) / 1000, stable: "", tail: "", done: false,
              }]);
            }
            setSpeaking(true);
          } else {
            st.preroll.push(f); st.prerollMs += ms;
            while (st.prerollMs > PREROLL_MS && st.preroll.length > 1) {
              const d = st.preroll.shift()!; st.prerollMs -= (d.length / st.rate) * 1000;
            }
            st.idleMs += ms;
            const auto = autoRef.current;
            if (st.heard && auto > 0 && st.idleMs >= auto) stopRef.current();
          }
        } else {
          st.seg.push(f); st.segMs += ms;
          if (voice) { st.silenceMs = 0; st.voicedMs += ms; }
          else st.silenceMs += ms;
          if (
            st.silenceMs >= SPLIT_MS ||
            st.segMs >= MAX_SEG_MS ||
            (st.segMs >= SOFT_MS && st.silenceMs >= SOFT_GAP_MS)
          ) flush();
        }
      };

      sess.current = st;
      if (startingGen.current === myGen) startingGen.current = null;
      setStatus("listening");
      void serviceCheck.then((ok) => {
        if (!ok && !st.browserSessionUsed && alive() && sess.current === st) {
          const hasWebSpeech = typeof window !== "undefined" && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
          if (!hasWebSpeech) {
            setError("Live dictation requires Google Chrome, Microsoft Edge, or Apple Safari.");
          }
        }
      });
    } catch (e) {
      console.error(e);
      if (startingGen.current === myGen) startingGen.current = null;
      stream.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
      if (myGen === gen.current) { setError("Could not start the microphone. Please try again."); setStatus("error"); }
    }
  }, [removeLine, upsert]);

  const stop = useCallback(() => {
    const st = sess.current;
    if (!st) {
      if (startingGen.current === gen.current) {
        startingGen.current = null;
        gen.current++;
        setStatus("idle"); setSpeaking(false); setLevel(0); setError("");
      }
      return Promise.resolve();
    }
    if (st.stopPromise) return st.stopPromise as Promise<void>;
    if (st.stopping) return Promise.resolve();
    const myGen = gen.current;
    st.stopping = true;
    setStatus("finishing"); setSpeaking(false); setLevel(0);

    try { st.recognition?.stop(); } catch {}

    if (st.inSpeech) st.flush();
    try { st.node.disconnect(); } catch {}
    st.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    st.ctx.close().catch(() => {});

    st.stopPromise = (async () => {
      await Promise.all([...st.finals]);
      if (st.browserSessionUsed && st.browserStopped) {
        await Promise.race([st.browserStopped, sleep(500)]);
      }
      if (myGen !== gen.current) return;

      const visibleLines = linesRef.current.filter((l) => l.stable || l.tail || l.failed);
      commit(fullRecordingFinalRef.current
        ? visibleLines.map((l) => ({ ...l, done: true }))
        : visibleLines.map((l) => ({ ...l, stable: `${l.stable} ${l.tail}`.trim(), tail: "", done: true }))
      );
      // No blanket error on failure — failed lines show per-line Retry buttons instead
      sess.current = null;
      setStatus("idle");
    })();
    return st.stopPromise;
  }, []);
  stopRef.current = stop;

  /** Retry a single failed line by re-submitting its saved WAV blob. */
  const retryLine = useCallback(async (id: number) => {
    const wav = failedWavs.current.get(id);
    if (!wav) return;
    const myGen = gen.current;
    const ok = () => myGen === gen.current;
    upsert(id, { failed: false, done: false });
    setPending((p) => p + 1);
    try {
      const t = await callWithRetry(wav, new AbortController().signal, ok, "final", promptRef.current);
      if (!ok()) return;
      if (t.trim()) {
        failedWavs.current.delete(id);
        upsert(id, { stable: t, tail: "", done: true, failed: false });
      } else {
        removeLine(id);
      }
    } catch {
      if (ok()) upsert(id, { failed: true, done: true });
    } finally {
      setPending((p) => Math.max(0, p - 1));
    }
  }, [upsert, removeLine]);

  const getTranscript = useCallback(() => {
    if (fullRecordingFinalRef.current) return browserLiveRef.current ? browserTranscriptRef.current.trim() : "";
    return linesRef.current.map((l) => `${l.stable} ${l.tail}`.trim()).filter(Boolean).join(" ").trim();
  }, []);
  const clearError = useCallback(() => {
    setError("");
    if (status === "error") setStatus("idle");
  }, [status]);

  // When speech service comes back online, automatically clear the error
  useEffect(() => {
    if (status !== "error" || !error) return;
    const interval = setInterval(async () => {
      const up = await speechUp();
      if (up) {
        setError("");
        setStatus("idle");
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [status, error]);

  const hasFailed = lines.some((l) => l.failed);

  useEffect(() => { reset(); }, [resetKey, reset]);
  useEffect(() => {
    fetch("/api/warmup").catch(() => {});
    return () => teardown();
  }, [teardown]);

  return { status, speaking, pending, level, error, lines, start, stop, reset, clearError, getTranscript, retryLine, hasFailed };
}
