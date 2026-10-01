"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Download, Info, Loader2, Timer, WifiOff, Mic, User, Video } from "lucide-react";
import { questions } from "@/lib/questions";
import { getDeviceInfo } from "@/lib/deviceInfo";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";
import MicPermission from "@/components/MicPermission";
import Recorder, { type AnswerData } from "@/components/Recorder";
import Sidebar, { STEPS } from "@/components/Sidebar";
import ErrorNote from "@/components/ErrorNote";
import ConfirmDialog from "@/components/ConfirmDialog";
import UserDetailsModal, { type UserDetails } from "@/components/UserDetailsModal";

const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

type InterviewAnswerResult = {
  questionId: number;
  questionText: string;
  englishText?: string;
  language?: string;
  confidence?: number | null;
  needsReview?: boolean;
  translationStatus?: "pending" | "done" | "failed";
  videoUrl?: string | null;
};

export default function InterviewPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<AnswerData>({ blob: null, videoBlob: null });
  const [results, setResults] = useState<InterviewAnswerResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [online, setOnline] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(stream);

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
    router.push("/");
  };

  const refreshStream = async (deviceId?: string) => {
    let freshAudioStream: MediaStream | null = null;
    let freshVideoStream: MediaStream | null = null;
    try {
      const currentStream = streamRef.current;
      freshAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : true,
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
        freshAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        const freshAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        router.replace("/");
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
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [router]);

  const current = questions[index];
  const isLast = index === questions.length - 1;
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
        : await navigator.mediaDevices.getUserMedia({ audio: true });
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

  const next = async () => {
    const { blob, videoBlob } = answer;
    if (!blob || !videoBlob || !interviewId) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("interviewId", interviewId);
      form.set("questionId", String(current.id));
      form.set("questionText", current.text);
      form.set("audio", blob, `answer.${blob.type.includes("mp4") ? "m4a" : "webm"}`);
      form.set("video", videoBlob, `answer-video.${videoBlob.type.includes("mp4") ? "mp4" : "webm"}`);
      form.set("audioMimeType", blob.type || "audio/webm");
      form.set("videoMimeType", videoBlob.type || "video/webm");
      form.set("isLast", String(isLast));
      const res = await fetch("/api/interview/submit-answer", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnswer({ blob: null, videoBlob: null });
      if (isLast) {
        stream?.getTracks().forEach((t) => t.stop());
        try {
          const resultsResponse = await fetch(`/api/interview/results?interviewId=${encodeURIComponent(interviewId)}`);
          const resultsData = await resultsResponse.json();
          if (!resultsResponse.ok) throw new Error(resultsData.error || "Could not load English results.");
          const translatedAnswers: InterviewAnswerResult[] = Array.isArray(resultsData.answers)
            ? resultsData.answers
            : [];
          setResults(translatedAnswers);
          if (translatedAnswers.some((item) => item.translationStatus !== "done")) {
            setError("Your audio and video were saved, but some English translations could not be generated. They can be retried later.");
          }
        } catch {
          setError("Your audio and video were saved, but English results could not be loaded. Retry them from the results endpoint later.");
        }
        setDone(true);
      } else {
        setIndex((i) => i + 1);
      }
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Saving failed. Your recording is kept, please try again.",
      );
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const restart = () => {
    setName(""); setInterviewId(null); setStream(null);
    setIndex(0); setAnswer({ blob: null, videoBlob: null }); setResults([]);
    setError(""); setDone(false); setElapsed(0);
  };

  const refId = interviewId ? interviewId.slice(-8).toUpperCase() : null;
  const answered = done ? questions.length : index;
  const StepIcon = STEPS[stepIndex].icon;

  const downloadTranscript = () => {
    const lines = [
      `Assessment: ${name}`,
      `Reference ID: ${refId}`,
      `Time taken: ${fmtTime(elapsed)}`,
      "",
      ...results.flatMap((item, i) => [
        `Q${i + 1}. ${item.questionText}`,
        item.englishText?.trim() || "(English translation unavailable)",
        item.language && !["en", "english"].includes(item.language.toLowerCase())
          ? `Translated from ${item.language}`
          : "",
        item.needsReview ? "Needs review" : "",
        "",
      ]),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-${refId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">
      <Sidebar
        current={done ? 2 : stepIndex}
        name={name}
        micReady={!!stream?.getAudioTracks().some((track) => track.readyState === "live")}
        cameraReady={!!stream?.getVideoTracks().some((track) => track.readyState === "live")}
        cameraLabel={stream?.getVideoTracks()[0]?.label ?? null}
        userDetails={userDetails}
        questionIndex={index}
        totalQuestions={questions.length}
        elapsed={elapsed}
        onOpenProfile={() => setUserModalOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
              <StepIcon size={24} />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900 sm:text-xl">{STEPS[stepIndex]?.fullLabel || "Assessment"}</h1>
              <p className="text-xs text-slate-500">Stage {stepIndex + 1} of {STEPS.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {interviewId && (
              <div className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-bold tabular-nums text-slate-700 shadow-sm">
                <Clock size={16} className="text-blue-600" />
                {fmtTime(elapsed)}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition-all duration-300 hover:bg-slate-100 hover:border-slate-300 cursor-pointer"
              title="Logout"
            >
              <User size={16} />
              <span>Logout</span>
            </button>
            <button
              onClick={() => setUserModalOpen(true)}
              className="flex size-11 items-center justify-center rounded-2xl bg-white text-blue-900 border-2 border-blue-300 text-sm font-black shadow-md transition-all duration-300 hover:scale-105 hover:bg-blue-50 cursor-pointer"
              title="View your profile"
            >
              {name.trim() ? name.trim()[0].toUpperCase() : "C"}
            </button>
          </div>
        </header>
        
        <div className="h-1 bg-slate-200 lg:hidden">
          <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
        </div>

        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-3 text-sm font-semibold text-amber-900 shadow-sm">
            <WifiOff size={18} className="text-amber-600" /> You are offline. Reconnect to save your answers, and keep this page open.
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-8">
            {/* Stage 1: Audio and video calibration */}
            {stepIndex === 0 && (
              <div className="fade-up mx-auto max-w-xl">
                <div className={`${card} p-8 sm:p-10 shadow-xl`}>
                  <MicPermission onGranted={setStream} onContinue={startInterview} continuing={busy} />
                  {error && <ErrorNote>{error}</ErrorNote>}
                </div>
              </div>
            )}

            {/* Stage 2: Audio and video assessment */}
            {stepIndex === 1 && (
              <div className="grid gap-8 xl:grid-cols-[1fr_350px]">
                <section key={current.id} className={`${card} fade-up overflow-hidden shadow-xl`}>
                  <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Section A · Screening</span>
                    <span className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/25">
                      Question {index + 1} of {questions.length}
                    </span>
                  </div>
                  <div className="p-8">
                    <h2
                      ref={headingRef}
                      tabIndex={-1}
                      className="font-display text-2xl font-bold leading-snug text-slate-900 outline-none sm:text-3xl"
                    >
                      {current.text}
                    </h2>
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                      <Timer size={18} className="text-blue-600" />
                      Suggested answer time: 30 to 60 seconds
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">Any language</span>
                      <span>Speak in any language. Your answers are converted to English.</span>
                    </div>
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
                    <div className="mt-8">
                      <Recorder
                        key={current.id}
                        stream={stream!}
                        onChange={setAnswer}
                        onRefreshStream={refreshStream}
                        onRefreshCamera={refreshCameraStream}
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
                    {error && <ErrorNote>{error}</ErrorNote>}
                  </div>
                  <div className="flex flex-col-reverse gap-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-600" aria-live="polite">
                      {!online ? "Offline: reconnect to continue." : answer.blob ? "Answer ready to save." : "Record your answer to continue."}
                    </p>
                    <button
                      onClick={isLast ? () => setConfirmOpen(true) : next}
                      disabled={!answer.blob || busy || !online}
                      className={`${btnPrimary} px-8 py-3 text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30`}
                    >
                      {busy && !confirmOpen ? (
                        <><Loader2 size={18} className="animate-spin" /> Saving...</>
                      ) : isLast ? (
                        "Review and submit"
                      ) : (
                        <>Next question <ArrowRight size={18} /></>
                      )}
                    </button>
                  </div>
                </section>

                <aside className="space-y-6">
                  <div className={`${card} p-6 shadow-lg`}>
                    <h3 className="text-sm font-bold text-slate-900">Question Palette</h3>
                    <div className="mt-4 grid grid-cols-5 gap-2">
                      {questions.map((q, i) => (
                        <div
                          key={q.id}
                          className={`flex h-12 items-center justify-center rounded-lg text-sm font-bold transition-all duration-300 ${
                            i < index
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
                  <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-lg">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-blue-900">
                      <Info size={18} className="text-blue-600" /> Guidelines
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {[
                        "Speak clearly at a steady pace.",
                        "Your audio is translated into English, and the video is saved with the answer.",
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
                <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-8 py-12 text-center text-white">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-2xl">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="font-display mt-6 text-3xl font-bold">Assessment Submitted</h2>
                  <p className="mt-2 text-lg text-blue-100">
                    Thank you, {name}. Your responses have been recorded successfully.
                  </p>
                </div>
                <dl className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-b border-slate-200 text-center sm:grid-cols-4 sm:divide-y-0">
                  {[
                    ["Reference ID", refId ?? "-"],
                    ["Answers saved", String(questions.length)],
                    ["Time taken", fmtTime(elapsed)],
                    ["Status", "Completed"],
                  ].map(([k, v]) => (
                    <div key={k} className="px-6 py-6">
                      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k}</dt>
                      <dd className={`mt-2 font-display text-xl font-bold ${k === "Status" ? "text-emerald-600" : "text-slate-900"}`}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="p-8">
                  {error && <ErrorNote>{error}</ErrorNote>}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display text-xl font-bold text-slate-900">Your Responses</h3>
                    <button onClick={downloadTranscript} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-105">
                      <Download size={18} /> Download Transcript
                    </button>
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
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {item.language && !["en", "english"].includes(item.language.toLowerCase()) && (
                            <span className="text-xs text-slate-600">Translated from {item.language}</span>
                          )}
                          {item.needsReview && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Needs review</span>
                          )}
                        </div>
                        {item.translationStatus === "done" && item.englishText ? (
                          <p className="text-sm leading-relaxed text-slate-700">{item.englishText}</p>
                        ) : (
                          <p role="status" className="text-sm text-amber-800">English translation unavailable. The audio and video are saved and can be retried later.</p>
                        )}
                        {item.videoUrl && (
                          <video
                            className="mt-4 aspect-video w-full rounded-lg bg-black object-contain"
                            src={item.videoUrl}
                            controls
                            playsInline
                            aria-label={`Recorded video for question ${i + 1}`}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col justify-center gap-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-6 sm:flex-row">
                  <Link href="/" className={`${btnSecondary} px-8 py-3 text-base`}>Back to home</Link>
                  <button onClick={restart} className={`${btnPrimary} px-8 py-3 text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30`}>Start another assessment</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit your assessment?"
        confirmLabel="Yes, submit"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={next}
      >
        You are about to save your last answer and finish the assessment. Answers cannot be changed after submission.
      </ConfirmDialog>

      <UserDetailsModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        userDetails={userDetails}
      />
    </div>
  );
}
