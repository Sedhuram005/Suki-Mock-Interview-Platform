"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; 0?: RecognitionAlternative };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type RecognitionErrorEvent = { error: string };

type BrowserRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type BrowserRecognitionConstructor = new () => BrowserRecognition;
type SpeechWindow = Window & {
  SpeechRecognition?: BrowserRecognitionConstructor;
  webkitSpeechRecognition?: BrowserRecognitionConstructor;
};

export type LiveSpeechStatus = "checking" | "unavailable" | "ready" | "listening" | "finishing" | "error";

function getRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

function joinSegments(segments: string[]) {
  return segments.join(" ").replace(/\s+/g, " ").trim();
}

export function useBrowserSpeechRecognition() {
  const [status, setStatus] = useState<LiveSpeechStatus>("checking");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const listeningRef = useRef(false);
  const failedRef = useRef(false);
  const finalSegmentsRef = useRef<string[]>([]);
  const finalTextRef = useRef("");
  const displayTextRef = useRef("");
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopPromiseRef = useRef<Promise<string> | null>(null);
  const stopResolverRef = useRef<((transcript: string) => void) | null>(null);

  useEffect(() => {
    setStatus(getRecognitionConstructor() ? "ready" : "unavailable");
    return () => {
      listeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setStatus("unavailable");
      return false;
    }

    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    recognitionRef.current?.abort();
    finalSegmentsRef.current = [];
    finalTextRef.current = "";
    displayTextRef.current = "";
    stopPromiseRef.current = null;
    stopResolverRef.current = null;
    failedRef.current = false;
    setText("");
    setError("");
    listeningRef.current = true;

    const getBestTranscript = () => {
      const final = finalTextRef.current.trim();
      const display = displayTextRef.current.trim();
      return display.length >= final.length ? display : final;
    };

    const finish = () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
      setStatus(failedRef.current ? "error" : "ready");
      const resolve = stopResolverRef.current;
      stopResolverRef.current = null;
      if (resolve) resolve(failedRef.current ? "" : getBestTranscript());
    };

    const setupInstance = () => {
      if (!listeningRef.current) return;
      const rec = new Recognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      const browserLanguage = typeof navigator !== "undefined" ? navigator.language : "en-US";
      rec.lang = /^en(?:-|$)/i.test(browserLanguage) ? browserLanguage : "en-IN";
      recognitionRef.current = rec;

      rec.onresult = (event) => {
        const interimSegments: string[] = [];
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const segment = result?.[0]?.transcript?.trim();
          if (!segment) continue;
          if (result.isFinal) finalSegmentsRef.current.push(segment);
          else interimSegments.push(segment);
        }

        finalTextRef.current = joinSegments(finalSegmentsRef.current);
        displayTextRef.current = joinSegments([...finalSegmentsRef.current, ...interimSegments]);
        setText(displayTextRef.current);
      };

      rec.onerror = (event) => {
        if (event.error === "no-speech" || event.error === "aborted") return;
        failedRef.current = true;
        listeningRef.current = false;
        setError("Live dictation lost connection. The saved recording will use local transcription instead.");
        setStatus("error");
      };

      rec.onend = () => {
        if (recognitionRef.current !== rec) return;
        // If still listening and not permanently failed, create fresh instance after minimal pause
        if (listeningRef.current && !failedRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (!listeningRef.current || failedRef.current) return;
            try {
              setupInstance();
            } catch {
              failedRef.current = true;
              finish();
            }
          }, 10);
          return;
        }
        finish();
      };

      try {
        rec.start();
      } catch {
        // Recognition already active
      }
    };

    try {
      setupInstance();
      setStatus("listening");
      return true;
    } catch {
      failedRef.current = true;
      listeningRef.current = false;
      setError("Live dictation could not start. The saved recording will use local transcription instead.");
      setStatus("error");
      recognitionRef.current = null;
      return false;
    }
  }, []);

  const stop = useCallback((): Promise<string> => {
    if (stopPromiseRef.current) return stopPromiseRef.current;
    const recognition = recognitionRef.current;
    const getBestTranscript = () => {
      const final = finalTextRef.current.trim();
      const display = displayTextRef.current.trim();
      return display.length >= final.length ? display : final;
    };
    if (!recognition || !listeningRef.current) return Promise.resolve(failedRef.current ? "" : getBestTranscript());

    listeningRef.current = false;
    setStatus("finishing");
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;

    let resolveStop!: (transcript: string) => void;
    const promise = new Promise<string>((resolve) => {
      resolveStop = resolve;
    });
    stopPromiseRef.current = promise;
    stopResolverRef.current = resolveStop;
    stopTimerRef.current = setTimeout(() => {
      try {
        recognition.abort();
      } catch {}
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      stopTimerRef.current = null;
      stopResolverRef.current = null;
      setStatus(failedRef.current ? "error" : "ready");
      resolveStop(failedRef.current ? "" : getBestTranscript());
    }, 500);

    try {
      recognition.stop();
    } catch {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      stopResolverRef.current = null;
      setStatus(failedRef.current ? "error" : "ready");
      resolveStop(failedRef.current ? "" : getBestTranscript());
    }
    return promise;
  }, []);

  const clear = useCallback(() => {
    listeningRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    restartTimerRef.current = null;
    stopTimerRef.current = null;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    finalSegmentsRef.current = [];
    finalTextRef.current = "";
    displayTextRef.current = "";
    stopPromiseRef.current = null;
    stopResolverRef.current = null;
    failedRef.current = false;
    setText("");
    setError("");
    setStatus(getRecognitionConstructor() ? "ready" : "unavailable");
  }, []);

  return {
    status,
    text,
    finalText: failedRef.current ? "" : (displayTextRef.current.trim() || finalTextRef.current.trim()),
    error,
    start,
    stop,
    clear,
  };
}
