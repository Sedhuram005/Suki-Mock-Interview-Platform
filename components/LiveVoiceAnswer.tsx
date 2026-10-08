"use client";
import { useLiveTranscription } from "@/hooks/useLiveTranscription";

export default function LiveVoiceAnswer(props: {
  sessionId: string;
  questionId: string;
  question: string;
  autoStopMs?: number;
  onSaved?: (text: string, answerId: string) => void;
}) {
  const { status, text, speaking, pending, error, start, stop } = useLiveTranscription(props);
  const listening = status === "listening";
  const busy = status === "finishing" || status === "saving";

  const label =
    listening ? (speaking ? "Hearing you…" : "Listening… start speaking") :
    status === "finishing" ? "Finishing…" :
    status === "saving" ? "Saving…" :
    status === "done" ? "Saved ✓" : "";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={listening ? stop : start}
          disabled={busy}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-sm ${
            listening
              ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
              : status === "done"
              ? "bg-slate-800 hover:bg-slate-900 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
          }`}
        >
          {listening ? "Stop" : status === "done" ? "Record again" : "Start answer"}
        </button>
        {label && (
          <p className="text-xs font-medium text-slate-500 transition-colors">
            {label}
          </p>
        )}
      </div>
      <div
        className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-800 focus:outline-none"
        style={{ minHeight: 80, whiteSpace: "pre-wrap" }}
      >
        {text || <span className="text-slate-400 italic">Words will appear here as you speak…</span>}
        {pending > 0 && <span className="text-blue-500 animate-pulse font-bold"> …</span>}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
