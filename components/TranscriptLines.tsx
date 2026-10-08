"use client";
import { useEffect, useRef } from "react";
import type { Line } from "@/hooks/useDictation";

export default function TranscriptLines({ lines, pending, listening }: { lines: Line[]; pending: number; listening: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = lines.filter((l) => l.stable || l.tail);
  const textLen = shown.reduce((n, l) => n + l.stable.length + l.tail.length, 0);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [textLen, shown.length]);

  return (
    <div>
      <div
        ref={ref}
        role="log"
        aria-live="off"
        aria-label="Your English transcript"
        className="h-56 overflow-y-auto rounded-xl bg-white p-4 text-[17px] leading-8 text-gray-900"
      >
        {shown.length === 0 && (
          <p className="select-none text-gray-400">
            {listening ? "Listening… start speaking in English." : "Start the microphone and speak. Your words will appear here as you talk."}
          </p>
        )}

        {shown.length > 0 && (
          <div className="space-y-1.5">
            {shown.map((l) => (
              <p key={l.id} className="break-words">
                <span>{l.stable}</span>
                {l.tail && <span className="text-gray-400">{l.stable ? " " : ""}{l.tail}</span>}
                {!l.done && listening && <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-blue-500" />}
              </p>
            ))}
          </div>
        )}
      </div>
      {(shown.some((l) => l.tail) || pending > 0) && (
        <p className="mt-1 text-xs text-gray-400">Light gray words are still being confirmed.</p>
      )}
    </div>
  );
}
