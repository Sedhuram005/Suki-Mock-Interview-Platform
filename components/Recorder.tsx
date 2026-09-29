"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Mic, Pause, Play, RotateCcw, Square } from "lucide-react";
import ErrorNote from "@/components/ErrorNote";

const MAX_SECONDS = 5 * 60;
const BAR_COUNT = 24;
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export type AnswerData = { blob: Blob | null; transcript: string };

type SpeechAlternativeLike = { transcript: string };
type SpeechResultLike = ArrayLike<SpeechAlternativeLike> & { isFinal: boolean };
type SpeechEventLike = Event & { results: ArrayLike<SpeechResultLike> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionErrorLike = Event & { error: string };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type RecorderProps = {
  stream: MediaStream;
  onChange: (answer: AnswerData) => void;
};

export default function Recorder({ stream, onChange }: RecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const speechRef = useRef<SpeechRecognitionLike | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const transcriptRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const durationRef = useRef(0);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedSecs, setRecordedSecs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [transcriptionNotice, setTranscriptionNotice] = useState("");
  const speechWindow = typeof window === "undefined"
    ? undefined
    : (window as typeof window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      });
  const speechSupported = Boolean(speechWindow?.SpeechRecognition || speechWindow?.webkitSpeechRecognition);

  useEffect(() => {
    if (!recording || typeof window.AudioContext === "undefined") return;

    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 64;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const frequencies = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;

    const updateBars = () => {
      analyser.getByteFrequencyData(frequencies);
      for (let index = 0; index < BAR_COUNT; index += 1) {
        const bar = barRefs.current[index];
        if (bar) bar.style.height = `${Math.max(6, (frequencies[index] / 255) * 42)}px`;
      }
      frame = requestAnimationFrame(updateBars);
    };

    void context.resume().catch(() => {});
    updateBars();

    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void context.close();
    };
  }, [recording, stream]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      speechRef.current?.stop();
    },
    [],
  );

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    durationRef.current = (Date.now() - startedAtRef.current) / 1000;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    speechRef.current?.stop();
    speechRef.current = null;
    setRecording(false);
  };

  const start = () => {
    setError("");
    setTranscriptionNotice("");
    setPlaying(false);
    setPosition(0);
    setRecordedSecs(0);
    setTranscript("");
    transcriptRef.current = "";
    recordedBlobRef.current = null;
    onChange({ blob: null, transcript: "" });

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    const track = stream.getAudioTracks()[0];
    if (!track || track.readyState !== "live" || track.muted) {
      setError("The microphone is not active. Reload the page and allow access again.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      chunksRef.current = [];
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size < 1000) {
          setError("No audio was captured. Check your microphone and try again.");
          onChange({ blob: null, transcript: transcriptRef.current });
          return;
        }

        recordedBlobRef.current = blob;
        setRecordedSecs(Math.max(1, durationRef.current));
        setAudioUrl(URL.createObjectURL(blob));
        onChange({ blob, transcript: transcriptRef.current });
      };
      recorder.onerror = () => {
        setError("The recording failed. Check your microphone and try again.");
        onChange({ blob: null, transcript: transcriptRef.current });
        setRecording(false);
      };

      recorder.start(250);
      recorderRef.current = recorder;
      const SpeechRecognition = speechWindow?.SpeechRecognition || speechWindow?.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const speech = new SpeechRecognition();
        speech.continuous = true;
        speech.interimResults = true;
        speech.lang = navigator.language || "en-US";
        speech.onresult = (event) => {
          const nextTranscript = Array.from(event.results)
            .map((result) => result[0]?.transcript ?? "")
            .join(" ")
            .trim();
          transcriptRef.current = nextTranscript;
          setTranscript(nextTranscript);
          onChange({ blob: recordedBlobRef.current, transcript: nextTranscript });
        };
        speech.onerror = (event) => {
          if (event.error === "aborted") return;
          setTranscriptionNotice(
            event.error === "no-speech"
              ? "No speech was recognized yet. Your audio will still be saved; you can enter the transcript below."
              : `Automatic transcription is unavailable (${event.error}). Your audio will still be saved; you can enter the transcript below.`,
          );
        };
        speechRef.current = speech;
        try {
          speech.start();
        } catch {
          speechRef.current = null;
        }
      }
      startedAtRef.current = Date.now();
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS) stop();
      }, 250);
    } catch {
      setError("Could not start recording. Check your microphone and try again.");
    }
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setError("Could not play this recording. Please record your answer again.");
      }
    } else {
      audio.pause();
    }
  };

  const updateTranscript = (value: string) => {
    transcriptRef.current = value;
    setTranscript(value);
    onChange({ blob: recordedBlobRef.current, transcript: value });
  };

  const remaining = Math.max(0, MAX_SECONDS - seconds);
  const progress = recordedSecs ? Math.min(position / recordedSecs, 1) : 0;

  return (
    <div className="space-y-4">
      {!audioUrl && (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
          {recording ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                <span className="size-2 animate-pulse rounded-full bg-red-600" />
                Recording
              </div>
              <div className={`mt-2 text-4xl font-semibold tabular-nums ${remaining <= 10 ? "text-amber-700" : "text-slate-900"}`}>
                {formatTime(seconds)}
              </div>
              <div className="mt-4 flex h-12 items-center gap-1" aria-label="Live microphone level">
                {Array.from({ length: BAR_COUNT }, (_, index) => (
                  <div
                    key={index}
                    ref={(element) => {
                      barRefs.current[index] = element;
                    }}
                    className="w-1 rounded-full bg-blue-700 transition-[height] duration-75"
                    style={{ height: 6 }}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {formatTime(remaining)} remaining. The bars should move when you speak.
              </p>
              <button
                type="button"
                onClick={stop}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <Square size={14} fill="currentColor" aria-hidden="true" /> Stop recording
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={start}
                aria-label="Start recording"
                title="Start recording"
                className="grid size-20 place-items-center rounded-full bg-blue-700 text-white shadow-md shadow-blue-200 transition hover:scale-105 hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
              >
                <Mic size={30} aria-hidden="true" />
              </button>
              <p className="mt-4 text-sm font-medium text-slate-900">Click to start recording</p>
              <p className="mt-1 text-xs text-slate-500">
                Up to {formatTime(MAX_SECONDS)}. Re-record before continuing if needed.
              </p>
            </>
          )}
        </div>
      )}

      {audioUrl && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={16} aria-hidden="true" /> Answer recorded
          </p>
          <audio
            ref={audioRef}
            className="sr-only"
            src={audioUrl}
            preload="auto"
            onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setPosition(0);
            }}
            onError={() => setError("This recording could not be decoded. Please record again.")}
          />
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={playing ? "Pause recording" : "Play recording"}
              title={playing ? "Pause recording" : "Play recording"}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-700 text-white transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {playing ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" aria-hidden="true" />}
            </button>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-emerald-200"
              role="progressbar"
              aria-label="Audio playback progress"
              aria-valuemin={0}
              aria-valuemax={recordedSecs}
              aria-valuenow={Math.min(position, recordedSecs)}
            >
              <div className="h-full rounded-full bg-emerald-700" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className="w-24 text-right text-xs tabular-nums text-emerald-900">
              {formatTime(position)} / {formatTime(recordedSecs)}
            </span>
          </div>
          <button
            type="button"
            onClick={start}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <RotateCcw size={14} aria-hidden="true" /> Re-record answer
          </button>
          <label className="mt-5 block text-sm font-medium text-slate-700">
            Transcript {speechSupported ? "(review and correct)" : "(optional)"}
            <textarea
              value={transcript}
              onChange={(event) => updateTranscript(event.target.value)}
              rows={3}
              placeholder={speechSupported ? "Your spoken answer will appear here." : "Add a transcript if you want one."}
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}
      {transcriptionNotice && (
        <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {transcriptionNotice}
        </p>
      )}
    </div>
  );
}