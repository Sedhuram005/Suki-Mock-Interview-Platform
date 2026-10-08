"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { concat, downsample, encodeWav } from "@/lib/pcm";

export type Status = "idle" | "listening" | "finishing" | "saving" | "done" | "error";

type Opts = {
  sessionId: string;
  questionId: string;
  question: string;
  autoStopMs?: number;                       // silence after speech that ends the answer (0 = off)
  onSaved?: (text: string, answerId: string) => void;
};

const SPLIT_MS = 300;      // pause that ends a sentence — shorter = words appear faster
const MAX_SEG_MS = 4000;   // force a cut so chunks stay short and latency stays low
const MIN_VOICED_MS = 80;  // allow very short utterances to pass through
const PREROLL_MS = 150;    // keep audio before speech onset

async function transcribeChunk(wav: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("audio", wav, "chunk.wav");
  const r = await fetch("/api/transcribe-chunk", {
    method: "POST",
    body: fd,
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error("chunk failed");
  return ((await r.json()).text ?? "").trim();
}

interface LiveSessionState {
  ctx: AudioContext;
  stream: MediaStream;
  node: AudioWorkletNode;
  rec: MediaRecorder;
  recDone: Promise<Blob>;
  rate: number;
  preroll: Float32Array[];
  prerollMs: number;
  seg: Float32Array[];
  segMs: number;
  voicedMs: number;
  inSpeech: boolean;
  silenceMs: number;
  idleMs: number;
  heard: boolean;
  noise: number;
  results: string[];
  counter: number;
  queue: Promise<void>;
  failed: number;
  stopping: boolean;
  flush: () => void;
}

export function useLiveTranscription(opts: Opts) {
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState("");

  const s = useRef<LiveSessionState | null>(null);
  const optsRef = useRef(opts);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  const start = useCallback(async () => {
    setError(""); setText(""); setPending(0); setSpeaking(false);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch {
      setError("Microphone permission denied."); setStatus("error"); return;
    }

    try {
      let ctx: AudioContext;
      try {
        ctx = new AudioContext({ sampleRate: 16000 });
      } catch {
        ctx = new AudioContext();
      }
      await ctx.resume();
      await ctx.audioWorklet.addModule("/pcm-processor.js");
      const src = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, "pcm-processor");
      const mute = ctx.createGain();
      mute.gain.value = 0;                       // keeps the graph running without echo
      src.connect(node); node.connect(mute); mute.connect(ctx.destination);

      // full-answer recording (saved to GridFS as-is, no conversion)
      const rec = new MediaRecorder(stream);
      const full: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size > 0 && full.push(e.data);
      const recDone = new Promise<Blob>((res) => {
        rec.onstop = () => res(new Blob(full, { type: rec.mimeType || "audio/webm" }));
      });
      rec.start();

      const st: LiveSessionState = {
        ctx, stream, node, rec, recDone, rate: ctx.sampleRate,
        preroll: [] as Float32Array[], prerollMs: 0,
        seg: [] as Float32Array[], segMs: 0, voicedMs: 0,
        inSpeech: false, silenceMs: 0, idleMs: 0, heard: false, noise: 0.0005,
        results: [] as string[], counter: 0, queue: Promise.resolve(), failed: 0, stopping: false,
        flush: () => {},
      };

      const flush = () => {
        const keep = st.voicedMs >= 100;
        const pcm = concat(st.seg);
        st.idleMs = st.silenceMs;
        st.seg = []; st.segMs = 0; st.voicedMs = 0; st.inSpeech = false;
        st.silenceMs = 0; st.preroll = []; st.prerollMs = 0;
        setSpeaking(false);
        if (!keep || pcm.length === 0) return;

        const idx = st.counter++;
        const wav = encodeWav(downsample(pcm, st.rate));
        setPending((p) => p + 1);
        st.queue = st.queue.then(async () => {
          let t = "";
          try {
            t = await transcribeChunk(wav);
          } catch {
            // First attempt failed — retry once before giving up
            try { t = await transcribeChunk(wav); } catch { /* silently skip this chunk */ }
          }
          // Always store result (even empty) so previous words are not lost
          st.results[idx] = t;
          // Show words immediately — join all non-empty segments so far
          setText(st.results.filter(Boolean).join(" "));
          setPending((p) => p - 1);
        });
      };
      st.flush = flush;

      node.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (st.stopping) return;
        const f = e.data;
        let sum = 0;
        for (let i = 0; i < f.length; i++) sum += f[i] * f[i];
        const rms = Math.sqrt(sum / f.length);
        const ms = (f.length / st.rate) * 1000;
        // Lower threshold: 0.0008 base so quiet speakers are captured
        const voice = rms > Math.max(0.0008, st.noise * 1.2);
        if (!voice) st.noise = Math.min(0.002, st.noise * 0.97 + rms * 0.03);

        if (!st.inSpeech) {
          if (voice) {
            st.inSpeech = true; st.heard = true;
            st.seg = [...st.preroll, f]; st.segMs = st.prerollMs + ms;
            st.voicedMs = ms; st.silenceMs = 0; st.idleMs = 0;
            setSpeaking(true);
          } else {
            st.preroll.push(f); st.prerollMs += ms;
            while (st.prerollMs > PREROLL_MS && st.preroll.length > 1) {
              const d = st.preroll.shift()!; st.prerollMs -= (d.length / st.rate) * 1000;
            }
            st.idleMs += ms;
            const auto = optsRef.current.autoStopMs ?? 4000;
            if (st.heard && auto > 0 && st.idleMs >= auto) stopRef.current();
          }
        } else {
          st.seg.push(f); st.segMs += ms;
          if (voice) { st.silenceMs = 0; st.voicedMs += ms; } else st.silenceMs += ms;
          if (st.silenceMs >= SPLIT_MS || st.segMs >= MAX_SEG_MS) flush();
        }
      };

      s.current = st;
      setStatus("listening");
    } catch (e) {
      console.error(e);
      stream.getTracks().forEach((t) => t.stop());
      setError("Could not start the microphone pipeline."); setStatus("error");
    }
  }, []);

  const stop = useCallback(async () => {
    const st = s.current;
    if (!st || st.stopping) return;
    st.stopping = true;
    setStatus("finishing"); setSpeaking(false);

    if (st.inSpeech) st.flush();
    try { st.node.disconnect(); } catch {}
    if (st.rec.state !== "inactive") st.rec.stop();
    st.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    st.ctx.close().catch(() => {});

    const audioBlob: Blob = await st.recDone;
    await st.queue;                                   // wait for the last sentence

    // Even if some chunks failed, use whatever text we captured
    const transcript = st.results.filter(Boolean).join(" ").trim();
    if (transcript.split(/\s+/).filter(Boolean).length < 2) {
      setError("No clear speech detected. Please speak closer to the microphone and try again.");
      setStatus("error"); return;
    }

    setStatus("saving");
    try {
      const { sessionId, questionId, question, onSaved } = optsRef.current;
      const fd = new FormData();
      fd.append("audio", audioBlob, "answer.webm");
      fd.append("transcript", transcript);
      fd.append("sessionId", sessionId);
      fd.append("questionId", questionId);
      fd.append("question", question);
      const res = await fetch("/api/save-answer", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setText(transcript);
      setStatus("done");
      onSaved?.(transcript, data.id);

      // score in the background
      fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId: data.id }),
      }).catch(() => {});
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || "Couldn't save this answer. Please record again.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  useEffect(() => {
    fetch("/api/warmup").catch(() => {}); // preload faster-whisper model
    return () => {
      const st = s.current;
      if (st && !st.stopping) {
        st.stopping = true;
        try { st.node.disconnect(); } catch {}
        try { if (st.rec.state !== "inactive") st.rec.stop(); } catch {}
        st.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        st.ctx.close().catch(() => {});
      }
    };
  }, []);

  return { status, text, speaking, pending, error, start, stop };
}
