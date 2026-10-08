"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Mic, Pause, Play, RotateCcw, Square, Clock } from "lucide-react";
import ErrorNote from "@/components/ErrorNote";

const MAX_SECONDS = 5 * 60;
const BAR_COUNT = 24;
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export type AnswerData = { blob: Blob | null; videoBlob: Blob | null };

type RecorderProps = {
  stream: MediaStream;
  onChange: (answer: AnswerData) => void;
  onRecordingStateChange?: (recording: boolean, audioTrack?: MediaStreamTrack) => void;
  onRefreshStream?: (deviceId?: string) => Promise<MediaStream | null>;
  onRefreshCamera?: (deviceId?: string) => Promise<MediaStream | null>;
  locked?: boolean;
};

export default function Recorder({ stream, onChange, onRecordingStateChange, onRefreshStream, onRefreshCamera, locked = false }: RecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordedVideoBlobRef = useRef<Blob | null>(null);
  const stoppedRecordersRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const durationRef = useRef(0);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputDetectedRef = useRef(false);
  const inputMeterAvailableRef = useRef(false);

  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    () => stream.getAudioTracks()[0]?.getSettings().deviceId || "default",
  );
  const [selectedCameraId, setSelectedCameraId] = useState(
    () => stream.getVideoTracks()[0]?.getSettings().deviceId || "default",
  );
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordedSecs, setRecordedSecs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inputSignalDetected, setInputSignalDetected] = useState(false);

  useEffect(() => {
    const updateInputs = () => {
      void navigator.mediaDevices?.enumerateDevices()
        .then((devices) => {
          setAudioInputs(devices.filter((device) => device.kind === "audioinput"));
          setVideoInputs(devices.filter((device) => device.kind === "videoinput"));
        })
        .catch(() => {});
    };
    updateInputs();
    navigator.mediaDevices?.addEventListener("devicechange", updateInputs);
    return () => navigator.mediaDevices?.removeEventListener("devicechange", updateInputs);
  }, []);

  useEffect(() => {
    if (!recording || typeof window.AudioContext === "undefined") return;

    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256; // Increased for better resolution
    analyser.smoothingTimeConstant = 0.8; // Smoother visualization
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const frequencies = new Uint8Array(analyser.frequencyBinCount);
    const waveform = new Uint8Array(analyser.fftSize);
    inputMeterAvailableRef.current = true;
    let frame = 0;

    const updateBars = () => {
      analyser.getByteFrequencyData(frequencies);
      analyser.getByteTimeDomainData(waveform);
      const rms = Math.sqrt(waveform.reduce((sum, sample) => sum + (sample - 128) ** 2, 0) / waveform.length);
      const hasFreqEnergy = frequencies.some((val) => val > 6);
      // High sensitivity threshold (0.3 RMS or frequency energy) to reliably detect low/whispered voice
      if ((rms > 0.3 || hasFreqEnergy) && !inputDetectedRef.current) {
        inputDetectedRef.current = true;
        setInputSignalDetected(true);
      }
      for (let index = 0; index < BAR_COUNT; index += 1) {
        const bar = barRefs.current[index];
        if (bar) {
          // Dynamic non-linear scaling so even quiet/soft voice animates the level bars clearly
          const normalized = Math.min(1, Math.pow(frequencies[index] / 255, 0.6) * 1.8);
          bar.style.height = `${Math.max(6, normalized * 42)}px`;
        }
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
      if (videoRecorderRef.current?.state === "recording") videoRecorderRef.current.stop();
    },
    [],
  );

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    durationRef.current = (Date.now() - startedAtRef.current) / 1000;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (videoRecorderRef.current?.state === "recording") videoRecorderRef.current.stop();
    setRecording(false);
    onRecordingStateChange?.(false);
  };

  const changeInput = async (deviceId: string) => {
    const previousDeviceId = stream.getAudioTracks()[0]?.getSettings().deviceId || "default";
    setError("");
    try {
      const nextStream = onRefreshStream
        ? await onRefreshStream(deviceId)
        : await navigator.mediaDevices.getUserMedia({
            audio: {
              ...(deviceId === "default" ? {} : { deviceId: { exact: deviceId } }),
              echoCancellation: true,
              noiseSuppression: false,
              autoGainControl: false,
              channelCount: 1,
              sampleRate: 16_000,
            },
          });
      if (!nextStream) throw new Error("No microphone stream was returned.");
      setSelectedDeviceId(deviceId);
    } catch {
      setSelectedDeviceId(previousDeviceId);
      setError("Could not use that microphone. Choose another input or check Chrome's microphone settings.");
    }
  };

  const changeCamera = async (deviceId: string) => {
    const previousDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId || "default";
    setError("");
    try {
      const nextStream = onRefreshCamera
        ? await onRefreshCamera(deviceId)
        : await navigator.mediaDevices.getUserMedia({
            video: deviceId === "default" ? true : { deviceId: { exact: deviceId } },
          });
      if (!nextStream) throw new Error("No camera stream was returned.");
      setSelectedCameraId(deviceId);
    } catch {
      setSelectedCameraId(previousDeviceId);
      setError("Could not use that camera. Check Chrome's camera settings and try again.");
    }
  };

  const start = async () => {
    setError("");
    setNotice("");
    setPlaying(false);
    setPosition(0);
    setRecordedSecs(0);
    inputDetectedRef.current = false;
    setInputSignalDetected(false);
    recordedBlobRef.current = null;
    recordedVideoBlobRef.current = null;
    stoppedRecordersRef.current = 0;
    onChange({ blob: null, videoBlob: null });

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    let activeStream = stream;
    const needsFreshStream =
      !activeStream ||
      activeStream.getAudioTracks().length === 0 ||
      activeStream.getAudioTracks().some((track) => track.readyState !== "live" || track.muted) ||
      activeStream.getVideoTracks().length === 0 ||
      activeStream.getVideoTracks().some((track) => track.readyState !== "live" || track.muted);

    if (needsFreshStream) {
      try {
        const refreshedStream = onRefreshStream
          ? await onRefreshStream()
          : await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: 1,
                sampleRate: 16_000,
              },
            });
        if (refreshedStream) {
          activeStream = refreshedStream;
        } else {
          setError("Microphone access could not be refreshed. Check the browser permission and selected input device, then try again.");
          return;
        }
      } catch {
        setError("Microphone access could not be refreshed. Check the browser permission and selected input device, then try again.");
        return;
      }
    }

    if (!activeStream.getAudioTracks().some((track) => track.readyState === "live")) {
      setError("No live microphone input is available. Check the browser permission and selected input device, then try again.");
      return;
    }
    if (!activeStream.getVideoTracks().some((track) => track.readyState === "live")) {
      setError("No live camera is available. Check the browser camera permission and try again.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError("Audio and video recording are not supported in this browser.");
      return;
    }

    try {
      chunksRef.current = [];
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const videoMimeType = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const audioStream = new MediaStream(activeStream.getAudioTracks());
      const audioRecorder = new MediaRecorder(audioStream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 64_000,
      });
      const videoRecorder = new MediaRecorder(activeStream, {
        ...(videoMimeType ? { mimeType: videoMimeType } : {}),
        videoBitsPerSecond: 180_000,
        audioBitsPerSecond: 48_000,
      });

      let recordingsFinalized = false;
      const finishRecordings = async () => {
        if (stoppedRecordersRef.current < 2 || recordingsFinalized) return;
        recordingsFinalized = true;

        const recordedAudio = new Blob(chunksRef.current, {
          type: audioRecorder.mimeType || "audio/webm",
        });
        const videoBlob = new Blob(videoChunksRef.current, {
          type: videoRecorder.mimeType || "video/webm",
        });

        if (recordedAudio.size < 1000 || videoBlob.size < 1000) {
          setError("Audio or video was not captured. Check your devices and try recording again.");
          onChange({ blob: null, videoBlob: null });
          return;
        }
        if (inputMeterAvailableRef.current && !inputDetectedRef.current && recordedAudio.size < 4000) {
          setError("No microphone sound was detected. Select the microphone you are speaking into, then record again.");
          onChange({ blob: null, videoBlob: null });
          return;
        }

        recordedBlobRef.current = recordedAudio;
        recordedVideoBlobRef.current = videoBlob;
        setRecordedSecs(Math.max(1, durationRef.current));
        setAudioUrl(URL.createObjectURL(recordedAudio));
        setVideoUrl(URL.createObjectURL(videoBlob));
        onChange({ blob: recordedAudio, videoBlob });
      };

      audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      audioRecorder.onstop = () => {
        stoppedRecordersRef.current += 1;
        void finishRecordings();
      };
      audioRecorder.onerror = () => {
        setError("Audio recording failed. Check your microphone and try again.");
        onChange({ blob: null, videoBlob: null });
        if (videoRecorder.state === "recording") videoRecorder.stop();
        setRecording(false);
        onRecordingStateChange?.(false);
      };
      videoRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) videoChunksRef.current.push(event.data);
      };
      videoRecorder.onstop = () => {
        stoppedRecordersRef.current += 1;
        void finishRecordings();
      };
      videoRecorder.onerror = () => {
        setError("The video recording failed. Check your camera and try again.");
        onChange({ blob: null, videoBlob: null });
        if (audioRecorder.state === "recording") audioRecorder.stop();
        setRecording(false);
        onRecordingStateChange?.(false);
      };

      chunksRef.current = [];
      videoChunksRef.current = [];
      recorderRef.current = audioRecorder;
      videoRecorderRef.current = videoRecorder;
      audioRecorder.start(250);
      videoRecorder.start(250);
      startedAtRef.current = Date.now();
      setSeconds(0);
      setRecording(true);
      onRecordingStateChange?.(true, activeStream.getAudioTracks()[0]);
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS) stop();
      }, 250);
    } catch {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      if (videoRecorderRef.current?.state === "recording") videoRecorderRef.current.stop();
      setRecording(false);
      onRecordingStateChange?.(false);
      setError("Could not start the audio/video recording. Check your devices and try again.");
    }
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setError("This browser could not play the audio preview. The captured audio and video are still available to submit or download.");
        setNotice("Audio preview is unavailable, but both recordings were captured. You can still submit or download the files.");
      }
    } else {
      audio.pause();
    }
  };

  const remaining = Math.max(0, MAX_SECONDS - seconds);
  const progress = recordedSecs ? Math.min(position / recordedSecs, 1) : 0;
  return (
    <div className="space-y-4">
      {audioInputs.length > 1 && (
        <label className="block text-sm font-medium text-slate-700">
          Microphone input
          <select
            value={selectedDeviceId}
            onChange={(event) => void changeInput(event.target.value)}
            disabled={recording || locked}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 disabled:bg-slate-100"
          >
            {audioInputs.map((device, index) => (
              <option key={device.deviceId || device.label} value={device.deviceId || "default"}>
                {device.label || `Microphone ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      {videoInputs.length > 1 && (
        <label className="block text-sm font-medium text-slate-700">
          Camera input
          <select
            value={stream.getVideoTracks()[0]?.getSettings().deviceId || selectedCameraId}
            onChange={(event) => void changeCamera(event.target.value)}
            disabled={recording || locked}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 disabled:bg-slate-100"
          >
            {videoInputs.map((device, index) => (
              <option key={device.deviceId || device.label} value={device.deviceId || "default"}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      {!audioUrl && (
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-4 sm:px-6 py-6 sm:py-8 text-center">
          {recording ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                <span className="size-2 animate-pulse rounded-full bg-red-600" />
                Recording audio and video
              </div>
              <div className={`mt-2 text-4xl font-semibold tabular-nums ${remaining <= 30 ? "text-red-600 animate-pulse" : remaining <= 60 ? "text-amber-700" : "text-slate-900"}`}>
                {formatTime(seconds)} <span className="text-sm font-bold text-slate-400">/ 5:00 limit</span>
              </div>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
                <Clock size={12} className={remaining <= 60 ? "text-amber-600" : "text-slate-500"} />
                {formatTime(remaining)} remaining before auto-stop
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
                {inputSignalDetected
                  ? `Microphone signal detected. Auto-stops at 5:00.`
                  : `Speak into the selected microphone; no signal detected yet.`}
              </p>
              <button
                type="button"
                onClick={stop}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Square size={14} fill="currentColor" aria-hidden="true" /> Stop recording
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={start}
                disabled={locked}
                aria-label="Start audio and video recording"
                title="Start audio and video recording"
                className="grid size-20 place-items-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mic size={30} aria-hidden="true" />
              </button>
              <p className="mt-4 text-xs font-bold text-blue-900">
                Time limit: 5 minutes (5:00 max)
              </p>
              <p className="mt-2.5 text-sm font-medium text-slate-900">Click to start audio and video recording</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Answer in English. Re-record before continuing if needed.
              </p>
            </>
          )}
        </div>
      )}

      {audioUrl && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={16} aria-hidden="true" /> Audio and video recorded
          </p>
          {videoUrl && (
            <video
              className="mt-4 aspect-video w-full rounded-lg bg-black object-contain"
              src={videoUrl}
              controls
              playsInline
              muted
              aria-label="Recorded interview video"
            />
          )}
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
            onError={() => {
              setError("");
              setNotice("Audio preview is unavailable in this browser, but both recordings were captured. You can still submit or download them.");
            }}
          />
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={playing ? "Pause recording" : "Play recording"}
              title={playing ? "Pause recording" : "Play recording"}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
          <a
            href={audioUrl}
            download="interview-answer.webm"
            className="mt-3 inline-flex text-sm font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
          >
            Download audio
          </a>
          {videoUrl && (
            <a
              href={videoUrl}
              download="interview-answer-video.webm"
              className="ml-4 mt-3 inline-flex text-sm font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
            >
              Download video
            </a>
          )}
          {locked ? (
            <p className="mt-4 text-xs font-medium text-emerald-800">Recording saved. Your English transcript is shown below.</p>
          ) : (
            <button
              type="button"
              onClick={start}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <RotateCcw size={14} aria-hidden="true" /> Re-record answer
            </button>
          )}
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}
      {notice && (
        <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {notice}
        </p>
      )}
    </div>
  );
}
