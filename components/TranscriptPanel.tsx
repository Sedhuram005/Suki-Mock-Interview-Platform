"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Line, MicStatus } from "@/hooks/useDictation";

type Props = {
  lines: Line[];
  status: MicStatus;
  speaking: boolean;
  level: number;
  pending: number;
  error?: string;
  onToggleMic?: () => void;
  onClear?: () => void;
  onClearError?: () => void;
  onRetry?: (id: number) => void;
  heightClass?: string;
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
function StopIcon() {
  return (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><rect x="6" y="6" width="12" height="12" rx="2" /></svg>);
}

function statusPill(status: MicStatus, speaking: boolean, hasLines: boolean) {
  if (status === "denied") return { text: "Mic blocked", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500", pulse: false };
  if (status === "error") return { text: "Needs attention", cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500", pulse: false };
  if (status === "requesting") return { text: "Allow microphone", cls: "bg-slate-50 text-slate-600 ring-slate-200", dot: "bg-slate-400", pulse: true };
  if (status === "finishing") return { text: "Finishing", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500", pulse: true };
  if (status === "listening") {
    return speaking
      ? { text: "Hearing you", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500", pulse: true }
      : { text: "Listening", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500", pulse: true };
  }
  return hasLines
    ? { text: "Stopped", cls: "bg-slate-50 text-slate-600 ring-slate-200", dot: "bg-slate-400", pulse: false }
    : { text: "Ready", cls: "bg-slate-50 text-slate-600 ring-slate-200", dot: "bg-slate-300", pulse: false };
}

export default function TranscriptPanel({
  lines, status, speaking, level, pending, error, onToggleMic, onClear, onClearError, onRetry, heightClass = "h-64",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [away, setAway] = useState(false);
  const [copied, setCopied] = useState(false);

  const listening = status === "listening";
  const shown = useMemo(() => lines.filter((l) => l.stable || l.tail || l.failed), [lines]);
  const thinking = lines.some((l) => !l.done && !l.stable && !l.tail);
  const hasTail = shown.some((l) => l.tail);
  const fullText = shown.map((l) => `${l.stable} ${l.tail}`.trim()).join(" ");
  const words = fullText ? fullText.split(/\s+/).length : 0;
  const lastDone = [...shown].reverse().find((l) => l.done)?.stable ?? "";
  const textLen = fullText.length;
  const pill = statusPill(status, speaking, shown.length > 0);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [textLen, shown.length, thinking]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    stick.current = near;
    setAway(!near);
  }
  function jump() {
    const el = scrollRef.current;
    if (!el) return;
    stick.current = true; setAway(false);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const bars = [0.5, 0.85, 1, 0.85, 0.5];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Live English transcript">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${listening ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"}`}>
          <MicIcon />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">Your English transcript</h3>
          <p className="truncate text-xs text-slate-500">English live captions with a final accuracy pass</p>
        </div>

        {listening && (
          <div className="flex h-6 items-end gap-[3px]" aria-hidden>
            {bars.map((m, i) => (
              <span key={i} className="w-[3px] rounded-full bg-indigo-400 transition-all duration-100" style={{ height: `${4 + level * m * 18}px` }} />
            ))}
          </div>
        )}

        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${pill.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${pill.dot} ${pill.pulse ? "animate-pulse" : ""}`} />
          {pill.text}
        </span>

        {onToggleMic && (
          <button
            type="button"
            onClick={onToggleMic}
            disabled={status === "requesting" || status === "finishing"}
            aria-pressed={listening}
            aria-label={listening ? "Stop microphone" : "Start microphone"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition focus:outline-none focus-visible:ring-4 disabled:opacity-50 ${
              listening ? "bg-red-500 hover:bg-red-600 focus-visible:ring-red-200" : "bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-200"
            }`}
          >
            {listening ? <StopIcon /> : <MicIcon />}
          </button>
        )}
      </header>

      {/* body */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          role="log"
          aria-live="off"
          aria-label="Transcript"
          className={`${heightClass} overflow-y-auto px-3 py-3`}
        >
          {shown.length === 0 && !thinking ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${listening ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
                <MicIcon />
              </div>
              <p className="text-sm font-medium text-slate-700">
                {listening ? "Listening… start speaking in English" : "Your words will appear here as you speak"}
              </p>
              <p className="text-xs text-slate-400">
                {listening ? "Speak naturally. Short pauses are fine." : "Start the microphone and answer the question out loud."}
              </p>
            </div>
          ) : (
            <div className="p-2 sm:p-3">
              <ul className="space-y-1">
                {shown.map((l) => (
                  <li key={l.id}>
                    {l.failed ? (
                      <p className="text-sm leading-7 text-red-600">
                        Couldn&apos;t convert this part.{" "}
                        <button
                          type="button"
                          onClick={() => onRetry?.(l.id)}
                          className="font-medium underline underline-offset-2 hover:text-red-700"
                        >
                          Retry
                        </button>
                      </p>
                    ) : (
                      <p className="break-words text-[17px] leading-7 text-slate-900">
                        <span>{l.stable}</span>
                        {l.tail && <span className="text-slate-400">{l.stable ? " " : ""}{l.tail}</span>}
                        {!l.done && listening && <span className="caret" />}
                      </p>
                    )}
                  </li>
                ))}
                {thinking && (
                  <li>
                    <span className="inline-block dots align-middle" aria-label="Transcribing live">
                      <span /><span /><span />
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {away && (
          <button
            type="button"
            onClick={jump}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur transition hover:bg-slate-900"
          >
            ↓ Latest
          </button>
        )}
      </div>

      {/* alerts */}
      {status === "denied" && (
        <div role="alert" className="border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          Microphone access is blocked. Click the lock icon in the address bar, allow the microphone, then start again.
        </div>
      )}
      {error && status !== "denied" && (
        <div role="alert" className="flex items-center justify-between gap-3 border-t border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          <span className="flex-1">{error}</span>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* footer */}
      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-xs text-slate-500">
        <span className="tabular-nums">{words} {words === 1 ? "word" : "words"}</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">{shown.length} {shown.length === 1 ? "line" : "lines"}</span>
        {listening && pending > 0 && (
          <span role="status" className="text-indigo-700">
            · Confirming {pending} {pending === 1 ? "line" : "lines"} in background · mic stays live
          </span>
        )}
        {listening && pending === 0 && (
          <span role="status" className="text-emerald-700">· Mic live · captions update as you speak</span>
        )}
        {!listening && pending > 0 && (
          <span role="status" className="text-indigo-700">· Finishing the final accuracy pass…</span>
        )}
        {hasTail && <span className="text-slate-400">· Gray words are live preview</span>}
        <span className="flex-1" />
        {shown.length > 0 && (
          <button type="button" onClick={copy} className="rounded-md px-2 py-1 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-indigo-600">
            {copied ? "Copied ✓" : "Copy"}
          </button>
        )}
        {onClear && shown.length > 0 && !listening && (
          <button type="button" onClick={onClear} className="rounded-md px-2 py-1 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-red-600">
            Clear
          </button>
        )}
      </footer>

      {/* screen readers hear finished lines only */}
      <div className="sr-only" aria-live="polite">{lastDone}</div>
    </section>
  );
}
