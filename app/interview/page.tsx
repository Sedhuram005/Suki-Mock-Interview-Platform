"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Info, WifiOff, Mic, User, Video, RotateCcw, Menu } from "lucide-react";
import { questions } from "@/lib/questions";
import { getDeviceInfo } from "@/lib/deviceInfo";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";
import MicPermission from "@/components/MicPermission";
import Recorder, { type AnswerData } from "@/components/Recorder";
import Sidebar, { STEPS } from "@/components/Sidebar";
import ErrorNote from "@/components/ErrorNote";
import UserDetailsModal, { type UserDetails } from "@/components/UserDetailsModal";
import { startPageLoad } from "@/lib/page-loader";
import SukiLoadingMark from "@/components/SukiLoadingMark";
import SukiPageLoader from "@/components/SukiPageLoader";
import { toWav16k } from "@/lib/wavEncoder";
import { useDictation } from "@/hooks/useDictation";
import TranscriptPanel from "@/components/TranscriptPanel";

const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const getAudioConstraints = (deviceId?: string): MediaTrackConstraints => ({
  ...(deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : {}),
  echoCancellation: true,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
  sampleRate: 16_000,
});

type InterviewAnswerResult = {
  questionId: number;
  questionText: string;
  transcript?: string;
  asrEngine?: string;
  transcriptionStatus?: "completed" | "failed";
  evaluationStatus?: "pending" | "processing" | "completed" | "failed";
  evaluation?: {
    communication: number;
    technical: number;
    relevance: number;
    completeness: number;
    clarity: number;
    overall: number;
    summary: string;
  } | null;
  draftEnglishText?: string;
  englishText?: string;
  humanVerified?: boolean;
  verifiedAt?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
};

export default function InterviewPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [name, setName] = useState("");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [index, setIndex] = useState(0);

  const dict = useDictation({
    resetKey: String(questions[index]?.id ?? index),
    prompt: questions[index]?.text ?? "",
  });
  const [answer, setAnswer] = useState<AnswerData>({ blob: null, videoBlob: null });
  const [results, setResults] = useState<InterviewAnswerResult[]>([]);
  const [latestTranscript, setLatestTranscript] = useState<{ questionId: number; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [online, setOnline] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(stream);
  const submittingQuestionIdRef = useRef<number | null>(null);
  const warmupStartedRef = useRef(false);
  const fallbackAsrWarmupStartedRef = useRef(false);
  const scorePollAttemptsRef = useRef(0);

  useEffect(() => {
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
  }, [stream, interviewId, index]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userData");
    localStorage.removeItem("userEmail");
    startPageLoad();
    router.push("/");
  };

  const refreshStream = async (deviceId?: string) => {
    let freshAudioStream: MediaStream | null = null;
    let freshVideoStream: MediaStream | null = null;
    try {
      const currentStream = streamRef.current;
      freshAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioConstraints(deviceId),
      });
      let videoTracks = currentStream?.getVideoTracks().filter((track) => track.readyState === "live") ?? [];
      if (videoTracks.length === 0) {
        freshVideoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoTracks = freshVideoStream.getVideoTracks();
      }
      const newStream = new MediaStream([...(freshAudioStream?.getAudioTracks() ?? []), ...videoTracks]);
      currentStream?.getAudioTracks().forEach((track) => track.stop());
      currentStream?.getVideoTracks().filter((track) => !videoTracks.includes(track)).forEach((track) => track.stop());
      streamRef.current = newStream;
      setStream(newStream);
      setError("");
      return newStream;
    } catch {
      freshAudioStream?.getTracks().forEach((track) => track.stop());
      freshVideoStream?.getTracks().forEach((track) => track.stop());
      setError("Could not refresh microphone or camera access. Check browser permissions and try again.");
      return null;
    }
  };

  const refreshCameraStream = async (deviceId?: string) => {
    let freshCameraStream: MediaStream | null = null;
    let freshAudioStream: MediaStream | null = null;
    try {
      const currentStream = streamRef.current;
      freshCameraStream = await navigator.mediaDevices.getUserMedia({
        video: deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : true,
      });
      let audioTracks = currentStream?.getAudioTracks().filter((track) => track.readyState === "live") ?? [];
      if (audioTracks.length === 0) {
        freshAudioStream = await navigator.mediaDevices.getUserMedia({ audio: getAudioConstraints() });
        audioTracks = freshAudioStream.getAudioTracks();
      }
      const nextStream = new MediaStream([...audioTracks, ...freshCameraStream.getVideoTracks()]);
      currentStream?.getVideoTracks().forEach((track) => track.stop());
      if (freshAudioStream) currentStream?.getAudioTracks().forEach((track) => track.stop());
      streamRef.current = nextStream;
      setStream(nextStream);
      setError("");
      return nextStream;
    } catch {
      freshCameraStream?.getTracks().forEach((track) => track.stop());
      freshAudioStream?.getTracks().forEach((track) => track.stop());
      setError("Could not refresh camera access. Check Chrome's camera settings and try again.");
      return null;
    }
  };

  // Monitor the mic track — if the browser silently kills it, auto-refresh
  useEffect(() => {
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;

    const handleTrackEnd = async () => {
      console.warn("[MicMonitor] Audio track ended, attempting auto-refresh...");
      try {
        const freshAudioStream = await navigator.mediaDevices.getUserMedia({ audio: getAudioConstraints() });
        const videoTracks = streamRef.current?.getVideoTracks().filter((videoTrack) => videoTrack.readyState === "live") ?? [];
        const newStream = new MediaStream([...freshAudioStream.getAudioTracks(), ...videoTracks]);
        streamRef.current?.getAudioTracks().forEach((audioTrack) => audioTrack.stop());
        streamRef.current = newStream;
        setStream(newStream);
        setError("");
      } catch {
        setError("Microphone disconnected. Please click 'Enable microphone' to reconnect.");
      }
    };

    track.addEventListener("ended", handleTrackEnd);
    return () => {
      track.removeEventListener("ended", handleTrackEnd);
      // Keep the microphone alive across interview stages; stop it only when the
      // interview ends or the whole page unmounts.
    };
  }, [stream]);

  // session timer
  useEffect(() => {
    if (!interviewId || done) return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [interviewId, done]);

  // warn before closing the tab mid-interview
  useEffect(() => {
    if (!interviewId || done) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [interviewId, done]);

  // connectivity
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    const timeout = window.setTimeout(() => setOnline(navigator.onLine), 0);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // load user details from localStorage and check authentication
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      if (!isLoggedIn) {
        startPageLoad();
        router.replace("/?next=%2Finterview");
        return;
      }

      const userData = localStorage.getItem("userData");
      if (userData) {
        try {
          const parsedData = JSON.parse(userData) as UserDetails;
          setUserDetails(parsedData);
          const resolvedName =
            parsedData.name ||
            (parsedData.firstName
              ? `${parsedData.firstName} ${parsedData.lastName || ""}`.trim()
              : "Candidate");
          setName(resolvedName);
        } catch (err) {
          console.error("Error parsing user data", err);
        }
      }
      setAuthReady(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [router]);



  useEffect(() => {
    if (!done || !interviewId || scorePollAttemptsRef.current >= 150) return;
    const hasPendingScores = results.some((item) => item.evaluationStatus === "pending" || item.evaluationStatus === "processing");
    if (!hasPendingScores) return;

    const timeout = window.setTimeout(async () => {
      scorePollAttemptsRef.current += 1;
      try {
        const params = new URLSearchParams({ interviewId });
        const response = await fetch(`/api/interview/results?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json();
        if (response.ok && Array.isArray(payload.answers)) setResults(payload.answers as InterviewAnswerResult[]);
      } catch {
        // Results remain available even if a background refresh fails.
      }
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [done, interviewId, results]);

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const transcriptForCurrent = latestTranscript?.questionId === current.id ? latestTranscript.text : null;
  const transcriptSavedForCurrent = transcriptForCurrent !== null;
  const stepIndex = done ? 2 : interviewId ? 1 : 0;

  // move focus to the question heading on each new question
  useEffect(() => {
    if (stepIndex === 1) headingRef.current?.focus();
  }, [index, stepIndex]);

  // create the session once the microphone is verified, including device metadata
  const ensureLiveStream = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser cannot access the microphone or camera.");
    }

    const currentStream = streamRef.current;
    const audioTracks = currentStream?.getAudioTracks().filter((track) => track.readyState === "live") ?? [];
    const videoTracks = currentStream?.getVideoTracks().filter((track) => track.readyState === "live") ?? [];
    if (audioTracks.length > 0 && videoTracks.length > 0) return currentStream!;

    let freshAudioStream: MediaStream | null = null;
    let freshVideoStream: MediaStream | null = null;
    try {
      freshAudioStream = audioTracks.length > 0
        ? null
        : await navigator.mediaDevices.getUserMedia({ audio: getAudioConstraints() });
      freshVideoStream = videoTracks.length > 0
        ? null
        : await navigator.mediaDevices.getUserMedia({ video: true });
      const nextAudioTracks = freshAudioStream?.getAudioTracks() ?? audioTracks;
      const nextVideoTracks = freshVideoStream?.getVideoTracks() ?? videoTracks;
      const nextStream = new MediaStream([...nextAudioTracks, ...nextVideoTracks]);
      currentStream?.getTracks().filter((track) => !nextStream.getTracks().includes(track)).forEach((track) => track.stop());
      streamRef.current = nextStream;
      setStream(nextStream);
      return nextStream;
    } catch (caught) {
      freshAudioStream?.getTracks().forEach((track) => track.stop());
      freshVideoStream?.getTracks().forEach((track) => track.stop());
      throw caught;
    }
  };

  const startInterview = async () => {
    setBusy(true);
    setError("");
    try {
      const activeStream = await ensureLiveStream();
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: name.trim() || userDetails?.name || "Candidate",
          userEmail: userDetails?.email || "",
          candidateName: name.trim() || userDetails?.name || "",
          device: getDeviceInfo(activeStream),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInterviewId(data.interviewId);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not start the interview. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async (recordedAnswer: AnswerData = answer, liveTranscript = "") => {
    const { blob, videoBlob } = recordedAnswer;
    if (
      !blob || !videoBlob || !interviewId ||
      submittingQuestionIdRef.current === current.id || transcriptSavedForCurrent
    ) return;

    if (dict.hasFailed) {
      setError("One part of your answer couldn't be converted. Please click Retry on it first, then save.");
      return;
    }

    submittingQuestionIdRef.current = current.id;
    setBusy(true);
    setError("");
    const cleanLiveTranscript = liveTranscript.replace(/\s+/g, " ").trim();
    const hasUsableLiveTranscript = cleanLiveTranscript.split(/\s+/).filter(Boolean).length >= 1;
    setProgressMessage(hasUsableLiveTranscript ? "Saving your English transcript and recording…" : "Running one final English accuracy pass over your answer…");
    try {
      // Use the complete recorder file for fallback transcription so dictation
      // startup latency cannot clip the first words from the audio-worklet copy.
      const speechWav = hasUsableLiveTranscript ? null : await toWav16k(blob);
      const form = new FormData();
      form.set("interviewId", interviewId);
      form.set("questionId", String(current.id));
      form.set("questionText", current.text);
      form.set("audio", blob, `answer.${blob.type.includes("mp4") ? "m4a" : "webm"}`);
      if (hasUsableLiveTranscript) form.set("liveTranscript", cleanLiveTranscript);
      if (speechWav) form.set("speechAudio", speechWav, "answer-16khz-mono.wav");
      form.set("video", videoBlob, `answer-video.${videoBlob.type.includes("mp4") ? "mp4" : "webm"}`);
      form.set("audioMimeType", blob.type || "audio/webm");
      form.set("videoMimeType", videoBlob.type || "video/webm");
      form.set("isLast", String(isLast));

      const response = await fetch("/api/interview/submit-answer", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not transcribe and save the recording.");

      const transcript = String(payload.transcript || "").trim();
      setLatestTranscript({ questionId: current.id, text: transcript });
      setResults((saved) => [
        ...saved.filter((item) => item.questionId !== current.id),
        {
          questionId: current.id,
          questionText: current.text,
          transcript,
          asrEngine: String(payload.asrEngine || "faster-whisper-en"),
          transcriptionStatus: "completed" as const,
          evaluationStatus: "pending" as const,
        },
      ].sort((a, b) => a.questionId - b.questionId));
      setProgressMessage("English transcript is ready below.");
    } catch (caught: unknown) {
      submittingQuestionIdRef.current = null;
      setError(caught instanceof Error ? caught.message : "Saving failed. Your recording is kept; please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleRecordingChange = async (recordedAnswer: AnswerData) => {
    setAnswer(recordedAnswer);
    if (recordedAnswer.blob && recordedAnswer.videoBlob) {
      setBusy(true);
      setError("");
      setProgressMessage("Preparing your final English transcript…");
      await dict.stop();
      const transcript = dict.getTranscript();
      await submitAnswer(recordedAnswer, transcript);
    }
  };

  const handleRecordingStateChange = (recording: boolean, audioTrack?: MediaStreamTrack) => {
    if (recording) {
      dict.reset();
      void dict.start(audioTrack);
    } else {
      void dict.stop();
    }
  };

  const reRecord = async () => {
    if (!transcriptSavedForCurrent || busy || !interviewId) return;
    setBusy(true);
    setError("");
    setProgressMessage("Deleting previous answer...");
    try {
      const res = await fetch("/api/interview/delete-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, questionId: current.id }),
      });
      if (!res.ok) throw new Error();

      setResults(prev => prev.filter(r => r.questionId !== current.id));
      setAnswer({ blob: null, videoBlob: null });
      setLatestTranscript(null);
      dict.reset();
      submittingQuestionIdRef.current = null;
    } catch {
      setError("Failed to delete the previous answer. Please try again.");
    } finally {
      setBusy(false);
      setProgressMessage("");
    }
  };

  const continueAfterTranscript = () => {
    if (!transcriptSavedForCurrent || busy) return;
    setError("");
    setProgressMessage("");
    setAnswer({ blob: null, videoBlob: null });
    setLatestTranscript(null);
    dict.reset();
    submittingQuestionIdRef.current = null;
    if (isLast) {
      scorePollAttemptsRef.current = 0;
      stream?.getTracks().forEach((track) => track.stop());
      setDone(true);
      void fetch("/api/interview/evaluate-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId }),
        keepalive: true,
      }).catch(() => {});
    } else {
      setIndex((value) => value + 1);
    }
  };

  const refId = interviewId ? interviewId.slice(-8).toUpperCase() : null;
  const answered = done ? questions.length : index + (transcriptSavedForCurrent ? 1 : 0);
  const StepIcon = STEPS[stepIndex].icon;
  const remaining = 30 * 60 - elapsed;
  if (!authReady) return <SukiPageLoader caption="Checking sign-in" />;

  return (
    <div className="fixed inset-0 flex min-h-0 overflow-hidden overscroll-none bg-white text-slate-900">
      <Sidebar
        current={done ? 3 : stepIndex}
        name={name}
        micReady={!!stream?.getAudioTracks().some((track) => track.readyState === "live")}
        cameraReady={!!stream?.getVideoTracks().some((track) => track.readyState === "live")}
        cameraLabel={stream?.getVideoTracks()[0]?.label ?? null}
        userDetails={userDetails}
        questionIndex={index}
        totalQuestions={questions.length}
        elapsed={elapsed}
        timeLeft={remaining}
        onOpenProfile={() => setUserModalOpen(true)}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onStartInterview={startInterview}
        onTestMic={refreshStream}
        onTestCamera={refreshCameraStream}
        onRunAllChecks={ensureLiveStream}
        isStarting={busy}
        online={online}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col m-1.5 sm:m-3 lg:ml-0 rounded-[20px] sm:rounded-[28px] border border-slate-200 bg-white overflow-hidden">
        <header className="flex h-16 sm:h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-8">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open sidebar menu"
              className="flex lg:hidden size-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <StepIcon size={24} />
            </div>
            <div>
              <h1 className="font-display text-sm font-semibold text-slate-900 sm:text-xl truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                {STEPS[stepIndex]?.fullLabel || "Assessment"}
              </h1>
              <p className="text-[11px] text-slate-500 sm:text-xs">Stage {stepIndex + 1} of {STEPS.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center gap-1.5 sm:gap-2 rounded-xl border px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-bold tabular-nums shadow-xs ${
                remaining <= 5 * 60
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-blue-200/90 bg-blue-50/90 text-blue-900"
              }`}
              title="Session time limit: 30 minutes total"
            >
              <Clock size={14} className={remaining <= 5 * 60 ? "text-rose-600 shrink-0" : "text-blue-600 shrink-0"} />
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold text-blue-700/80">
                Limit:
              </span>
              <span>{fmtTime(Math.max(0, remaining))}</span>
            </div>
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
              title="Logout"
            >
              <User size={16} />
              <span>Logout</span>
            </button>
            <button
              onClick={() => setUserModalOpen(true)}
              className="flex size-9 sm:size-11 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-600 text-white text-xs sm:text-sm font-black shadow-md transition hover:bg-blue-700 cursor-pointer"
              title="View your profile"
            >
              {name.trim() ? name.trim()[0].toUpperCase() : "C"}
            </button>
          </div>
        </header>
        
        <div className="h-1 bg-slate-100 lg:hidden">
          <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
        </div>

        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-3 text-sm font-semibold text-amber-900 shadow-sm">
            <WifiOff size={18} className="text-amber-600" /> You are offline. Reconnect to save your answers, and keep this page open.
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
          <div className="mx-auto max-w-7xl p-3 sm:p-8">
            {/* Stage 1: Audio and video calibration */}
            {stepIndex === 0 && (
              <div className="fade-up mx-auto max-w-xl">
                <div className={`${card} p-5 sm:p-10`}>
                  <MicPermission onGranted={setStream} onContinue={startInterview} continuing={busy} />
                  {error && <ErrorNote>{error}</ErrorNote>}
                </div>
              </div>
            )}

            {/* Stage 2: Audio and video assessment */}
            {stepIndex === 1 && (
              <div className="grid gap-6 sm:gap-8 xl:grid-cols-[1fr_350px]">
                <section key={current.id} className={`${card} fade-up overflow-hidden`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 sm:px-8 py-3.5 sm:py-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Section A · Screening</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/90 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-2xs">
                        <Clock size={12} className="text-amber-600" />
                        5m limit / question
                      </span>
                      <span className="rounded-full bg-blue-600 px-3.5 py-1 text-xs font-bold text-white">
                        Question {index + 1} of {questions.length}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 sm:p-8">
                    <h2
                      ref={headingRef}
                      tabIndex={-1}
                      className="font-display text-xl font-bold leading-snug text-slate-900 outline-none sm:text-3xl"
                    >
                      {current.text}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      Answer in English. Live captions appear as you speak; Ollama scoring starts after the final answer.
                    </p>
                    <div className="mx-auto mt-6 w-full max-w-4xl">
                      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 shadow-lg">
                        <video
                          ref={cameraVideoRef}
                          autoPlay
                          muted
                          playsInline
                          aria-label="Live video assessment preview"
                          className="h-full w-full -scale-x-100 object-cover"
                        />
                        <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white">
                          <Video size={14} /> Camera on
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5"><Video size={14} /> Camera: {stream?.getVideoTracks()[0]?.label || "Default camera"}</span>
                        <span className="inline-flex items-center gap-1.5"><Mic size={14} /> Microphone: {stream?.getAudioTracks()[0]?.label || "Default microphone"}</span>
                      </div>
                    </div>
                    <div key={current.id} className="mt-8">
                      <Recorder
                        key={current.id}
                        stream={stream!}
                        onChange={handleRecordingChange}
                        onRecordingStateChange={handleRecordingStateChange}
                        onRefreshStream={refreshStream}
                        onRefreshCamera={refreshCameraStream}
                        locked={busy || transcriptSavedForCurrent}
                      />
                      {error && (error.includes("microphone") || error.includes("camera")) && (
                        <button
                          onClick={() => void refreshStream()}
                          className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Mic size={16} />
                          <Video size={16} />
                          Refresh audio and camera access
                        </button>
                      )}
                    </div>
                    <div className="mt-5">
                      {transcriptSavedForCurrent ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                              <CheckCircle2 size={18} aria-hidden="true" />
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">Your English transcript</h3>
                              <p className="text-xs text-slate-600">Saved answer · Ready for next question</p>
                            </div>
                            <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-300">
                              Transcript saved
                            </span>
                          </div>
                          <div className="min-h-20 rounded-xl border border-white/80 bg-white p-4 shadow-sm">
                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800 font-medium">{transcriptForCurrent}</p>
                          </div>
                        </div>
                      ) : (
                        <TranscriptPanel
                          lines={dict.lines}
                          status={dict.status}
                          speaking={dict.speaking}
                          level={dict.level}
                          pending={dict.pending}
                          error={dict.error}
                          onClear={dict.reset}
                          onClearError={dict.clearError}
                          onRetry={dict.retryLine}
                        />
                      )}
                    </div>
                    {error && <ErrorNote onDismiss={() => setError("")}>{error}</ErrorNote>}
                  </div>
                  <div className="flex flex-col-reverse gap-4 border-t border-slate-100 bg-white px-4 sm:px-8 py-4 sm:py-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-600" aria-live="polite">
                      {!online ? "Offline: reconnect to continue." : busy ? progressMessage : transcriptSavedForCurrent ? "Your transcript is below. Continue when you’re ready." : answer.blob ? "Transcription did not finish. Try again." : "Your answer will transcribe automatically after recording."}
                    </p>
                    <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {transcriptSavedForCurrent && (
                        <button
                          onClick={() => void reRecord()}
                          disabled={busy || !online}
                          className="flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 whitespace-nowrap"
                        >
                          <RotateCcw size={18} />
                          Re-record
                        </button>
                      )}
                      <button
                      onClick={transcriptSavedForCurrent ? continueAfterTranscript : () => void submitAnswer(answer, dict.getTranscript())}
                      disabled={(!answer.blob && !transcriptSavedForCurrent) || busy || !online}
                      className={`${btnPrimary} flex-1 sm:flex-none justify-center px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30`}
                    >
                      {busy ? (
                        <>
                          <SukiLoadingMark size={18} />
                          {dict.getTranscript().split(/\s+/).filter(Boolean).length >= 3 ? "Saving answer…" : progressMessage.includes("Finishing") ? "Finishing transcript…" : "Transcribing…"}
                        </>
                      ) : transcriptSavedForCurrent ? isLast ? (
                        "Finish assessment"
                      ) : (
                        <>Next question <ArrowRight size={18} /></>
                      ) : answer.blob ? (
                        dict.getTranscript() ? "Retry save" : "Retry transcription"
                      ) : (
                        "Waiting for recording"
                      )}
                    </button>
                  </div></div>
                </section>

                <aside className="space-y-6">
                  <div className={`${card} p-6`}>
                    <h3 className="text-sm font-bold text-slate-900">Question Palette</h3>
                    <div className="mt-4 grid grid-cols-5 gap-2">
                      {questions.map((q, i) => (
                        <div
                          key={q.id}
                          className={`flex h-12 items-center justify-center rounded-lg text-sm font-bold transition-all duration-300 ${
                            i < index || (i === index && transcriptSavedForCurrent)
                              ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25"
                              : i === index
                              ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-4 ring-blue-100"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <dl className="mt-6 grid grid-cols-2 gap-4 text-center">
                      <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 py-4 shadow-sm">
                        <dd className="font-display text-2xl font-bold text-emerald-700">{answered}</dd>
                        <dt className="text-xs font-semibold text-emerald-600/80">Answered</dt>
                      </div>
                      <div className="rounded-xl bg-slate-100 py-4 shadow-sm">
                        <dd className="font-display text-2xl font-bold text-slate-700">{questions.length - answered}</dd>
                        <dt className="text-xs font-semibold text-slate-500">Remaining</dt>
                      </div>
                    </dl>
                    <ul className="mt-6 space-y-2 text-xs text-slate-600">
                      <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500" /> Answered</li>
                      <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600" /> Current</li>
                      <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-300" /> Not visited</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-blue-900">
                      <Info size={18} className="text-blue-600" /> Guidelines
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {[
                        "Speak clearly at a steady pace.",
                        "Your original audio and video are saved with the answer.",
                        "Answers cannot be changed after saving.",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-blue-900/80">
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>
            )}

            {/* Completion */}
            {done && (
              <div className={`${card} fade-up mx-auto max-w-4xl overflow-hidden shadow-2xl`}>
                <div className="border-b border-slate-200 bg-white px-8 py-12 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="font-display mt-6 text-3xl font-bold text-slate-900">Interactive assessment submitted</h2>
                  <p className="mt-2 text-lg text-slate-600">
                    Thank you, {name}. Your spoken responses are saved. Continue to the React quiz to complete both assessment stages.
                  </p>
                </div>
                <dl className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-b border-slate-200 text-center sm:grid-cols-4 sm:divide-y-0">
                  {[
                    ["Reference ID", refId ?? "-"],
                    ["Answers saved", String(questions.length)],
                    ["Time taken", fmtTime(elapsed)],
                    ["Status", "Next: React quiz"],
                  ].map(([k, v]) => (
                    <div key={k} className="px-6 py-6">
                      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k}</dt>
                      <dd className={`mt-2 font-display text-xl font-bold ${k === "Status" ? "text-emerald-600" : "text-slate-900"}`}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="p-8">
                  {error && <ErrorNote>{error}</ErrorNote>}
                  <div className="mb-6">
                    <h3 className="font-display text-xl font-bold text-slate-900">Your Responses</h3>
                  </div>
                  <ul className="space-y-4">
                    {results.map((item, i) => (
                      <li key={item.questionId} className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-sm font-bold">
                            {i + 1}
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Question {i + 1}</p>
                        </div>
                        <p className="text-base font-semibold text-slate-900 mb-2">{item.questionText}</p>
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-blue-800">English transcript</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                            {item.transcript || item.englishText || item.draftEnglishText || "No transcript was returned for this answer."}
                          </p>
                          {item.asrEngine && (
                            <p className="mt-2 text-xs text-slate-500">
                              {item.asrEngine === "faster-whisper-en"
                                ? "Recognized locally with faster-whisper · English only"
                                : item.asrEngine === "browser-speech-recognition-en"
                                  ? "Live browser dictation · English only"
                                  : item.asrEngine}
                            </p>
                          )}
                        </div>
                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                          {item.evaluationStatus === "completed" && item.evaluation ? (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-bold text-slate-900">Answer score</p>
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-900">{item.evaluation.overall}/10 overall</span>
                              </div>
                              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                                {(["communication", "technical", "relevance", "completeness", "clarity"] as const).map((key) => (
                                  <div key={key} className="rounded-lg bg-slate-50 p-2">
                                    <dt className="capitalize text-slate-500">{key}</dt>
                                    <dd className="mt-1 font-bold text-slate-900">{item.evaluation![key]}/10</dd>
                                  </div>
                                ))}
                              </dl>
                              {item.evaluation.summary && <p className="mt-3 text-sm leading-relaxed text-slate-700">{item.evaluation.summary}</p>}
                            </>
                          ) : item.evaluationStatus === "failed" ? (
                            <p className="text-sm text-amber-800">Scoring is unavailable for this answer.</p>
                          ) : (
                            <p className="flex items-center gap-2 text-sm text-slate-600"><SukiLoadingMark size={14} /> Scoring in the background…</p>
                          )}
                        </div>
                        {item.videoUrl && (
                          <video
                            className="mt-4 aspect-video w-full rounded-lg bg-black object-contain"
                            src={item.videoUrl}
                            controls
                            playsInline
                            aria-label={`Recorded video for question ${i + 1}`}
                          />
                        )}
                        {item.audioUrl && (
                          <audio
                            className="mt-3 w-full"
                            src={item.audioUrl}
                            controls
                            aria-label={`Original audio for question ${i + 1}`}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col justify-center gap-4 border-t border-slate-100 bg-white px-8 py-6 sm:flex-row">
                  {interviewId && (
                    <Link
                      href={`/react-quiz?interviewId=${encodeURIComponent(interviewId)}`}
                      className={`${btnPrimary} px-8 py-3 text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30`}
                    >
                      Continue to React MCQ quiz <ArrowRight size={18} />
                    </Link>
                  )}
                  <Link href="/" className={`${btnSecondary} px-8 py-3 text-base`}>Back to home</Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <UserDetailsModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        userDetails={userDetails}
      />
    </div>
  );
}
