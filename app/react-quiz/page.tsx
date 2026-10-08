"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Camera, CheckCircle2, Clock, Code2, Home, Trophy, Video } from "lucide-react";
import Sidebar, { STEPS } from "@/components/Sidebar";
import ErrorNote from "@/components/ErrorNote";
import ConfirmDialog from "@/components/ConfirmDialog";
import SukiPageLoader from "@/components/SukiPageLoader";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";
import type { UserDetails } from "@/components/UserDetailsModal";

type QuizQuestion = { id: number; question: string; options: string[] };
type SavedQuizAnswer = { questionId: number; selectedOption: number };
type QuizResult = { score: number; total: number; submittedAt?: string | null; videoUrl?: string | null };

function ReactQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewId = searchParams.get("interviewId");
  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState("Candidate");
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [recordingSaveStatus, setRecordingSaveStatus] = useState("");
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingDurationMsRef = useRef<number>(0);
  const recordingIdRef = useRef<string | null>(null);
  const videoChunkIndexRef = useRef(0);
  const videoChunkUploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const videoChunkUploadErrorRef = useRef("");
  const pendingRecordingRef = useRef<Blob | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

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
    if (cameraPreviewRef.current) cameraPreviewRef.current.srcObject = cameraStream;
  }, [cameraStream, quizStarted]);

  useEffect(() => () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* The browser may have already stopped the recorder. */ }
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!quizStarted || result) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [quizStarted, result]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      if (!isLoggedIn) {
        router.replace("/");
        return;
      }

      const storedUser = localStorage.getItem("userData");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as UserDetails;
          if (!cancelled) {
            setUserDetails(parsed);
            const name = parsed.name || `${parsed.firstName || ""} ${parsed.lastName || ""}`.trim();
            if (name) setCandidateName(name);
          }
        } catch {
          // Keep the generic candidate label if the cached profile is unreadable.
        }
      }

      if (!interviewId) {
        setError("Open the React quiz from your completed interactive assessment.");
        setLoading(false);
        return;
      }

      void (async () => {
        try {
          const response = await fetch(`/api/interview/react-quiz?interviewId=${encodeURIComponent(interviewId)}`, { cache: "no-store" });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Could not load the React quiz.");
          if (cancelled) return;
          setQuizQuestions(Array.isArray(payload.questions) ? payload.questions : []);
          const savedAnswers = Array.isArray(payload.answers) ? payload.answers as SavedQuizAnswer[] : [];
          setAnswers(Object.fromEntries(savedAnswers.map((answer) => [answer.questionId, answer.selectedOption])));
          if (Number.isInteger(payload.score)) {
            setResult({
              score: payload.score,
              total: Array.isArray(payload.questions) ? payload.questions.length : 20,
              submittedAt: payload.submittedAt,
              videoUrl: payload.videoUrl ?? null,
            });
          }
          setSaveStatus(savedAnswers.length ? "Saved progress restored" : "Your selections save as you go");
        } catch (caught) {
          if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load the React quiz.");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [interviewId, router]);

  useEffect(() => {
    if (loading || result || !quizStarted) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [loading, result, quizStarted]);

  const releaseCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
    setCameraReady(false);
  };

  const discardCurrentRecording = async () => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        try { recorder.stop(); } catch { resolve(); }
      });
    }
    await videoChunkUploadQueueRef.current.catch(() => undefined);
    recordedChunksRef.current = [];
    recordingStartedAtRef.current = null;
    recordingDurationMsRef.current = 0;
    recordingIdRef.current = null;
    videoChunkIndexRef.current = 0;
    videoChunkUploadErrorRef.current = "";
    setRecordingSaveStatus("");
    pendingRecordingRef.current = null;
    releaseCamera();
  };

  const startQuizWithCamera = async (restart = false) => {
    if (cameraStarting) return;
    setCameraStarting(true);
    setCameraError("");
    setError("");
    let newStream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is unavailable. Open this page in a browser that supports camera access over HTTPS or localhost.");
      }
      if (typeof MediaRecorder === "undefined") {
        throw new Error("This browser cannot record quiz video. Please use a current version of Chrome, Edge, Firefox, or Safari.");
      }

      if (restart) await discardCurrentRecording();
      newStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 20, max: 24 } },
        audio: false,
      });
      const videoTrack = newStream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== "live") {
        throw new Error("The camera did not start. Check the camera connection and try again.");
      }

      // A resumed draft has no earlier video. Clear it so the saved recording covers every answer.
      if (restart || Object.keys(answers).length > 0) {
        await saveQueueRef.current;
        await videoChunkUploadQueueRef.current;
        const resetResponse = await fetch("/api/interview/react-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewId, action: "reset" }),
        });
        const resetPayload = await resetResponse.json();
        if (!resetResponse.ok) throw new Error(resetPayload.error || "Could not restart the quiz.");
        setAnswers({});
        setSaveStatus("Progress cleared for a full-length camera recording");
      }

      const recordingResponse = await fetch("/api/interview/react-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, action: "recording-start" }),
      });
      const recordingPayload = await recordingResponse.json();
      if (!recordingResponse.ok || typeof recordingPayload.recordingId !== "string") {
        throw new Error(recordingPayload.error || "Could not prepare database storage for the camera video.");
      }
      recordingIdRef.current = recordingPayload.recordingId;
      videoChunkIndexRef.current = 0;
      videoChunkUploadQueueRef.current = Promise.resolve();
      videoChunkUploadErrorRef.current = "";
      setRecordingSaveStatus("Camera video will be saved to the database during the quiz");

      const supportedType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = supportedType
        ? new MediaRecorder(newStream, { mimeType: supportedType, videoBitsPerSecond: 450_000 })
        : new MediaRecorder(newStream, { videoBitsPerSecond: 450_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        chunks.push(event.data);
        const chunkIndex = videoChunkIndexRef.current++;
        const recordingId = recordingIdRef.current;
        if (!recordingId || videoChunkUploadErrorRef.current) return;

        setRecordingSaveStatus("Saving camera video to the database…");
        const form = new FormData();
        form.append("interviewId", interviewId!);
        form.append("action", "video-chunk");
        form.append("recordingId", recordingId);
        form.append("chunkIndex", String(chunkIndex));
        form.append("videoMimeType", recorder.mimeType || event.data.type || "video/webm");
        const extension = (recorder.mimeType || event.data.type).toLowerCase().includes("mp4") ? "mp4" : "webm";
        form.append("video", event.data, `react-mcq-${recordingId}-${chunkIndex}.${extension}`);
        videoChunkUploadQueueRef.current = videoChunkUploadQueueRef.current
          .then(async () => {
            if (videoChunkUploadErrorRef.current) return;
            let failureMessage = "Could not save a camera video segment.";
            for (let attempt = 0; attempt < 3; attempt += 1) {
              try {
                const response = await fetch("/api/interview/react-quiz", { method: "POST", body: form });
                const payload = await response.json();
                if (response.ok) {
                  setRecordingSaveStatus("Camera video saved to the database");
                  return;
                }
                failureMessage = payload.error || failureMessage;
                if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
              } catch (caught) {
                failureMessage = caught instanceof Error ? caught.message : failureMessage;
              }
              if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 300 * (attempt + 1)));
            }
            throw new Error(failureMessage);
          })
          .catch((caught: unknown) => {
            const message = caught instanceof Error ? caught.message : "A camera video segment could not be saved.";
            videoChunkUploadErrorRef.current = message;
            setCameraReady(false);
            setCameraError(`${message} Restart the quiz recording to continue.`);
            if (recorder.state === "recording") {
              try { recorder.stop(); } catch { /* The browser may already have stopped it. */ }
            }
          });
      };
      recorder.onerror = () => {
        setCameraReady(false);
        setCameraError("Video recording stopped unexpectedly. Restart the quiz recording to continue.");
      };
      videoTrack.addEventListener("ended", () => {
        setCameraReady(false);
        setCameraError("The camera was disconnected. Restart the quiz recording to continue; restarting clears the saved answers so the video covers the full quiz.");
      }, { once: true });
      recorder.start(5000);

      cameraStreamRef.current = newStream;
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = chunks;
      recordingStartedAtRef.current = Date.now();
      recordingDurationMsRef.current = 0;
      pendingRecordingRef.current = null;
      setCameraStream(newStream);
      setCameraReady(true);
      setQuizStarted(true);
    } catch (caught) {
      newStream?.getTracks().forEach((track) => track.stop());
      const message = caught instanceof Error ? caught.message : "Could not start the camera recording.";
      setCameraError(message);
    } finally {
      setCameraStarting(false);
    }
  };

  const finishRecording = async () => {
    if (pendingRecordingRef.current) return pendingRecordingRef.current;
    const recorder = mediaRecorderRef.current;
    if (!recorder) throw new Error("The quiz video recording is unavailable. Restart the quiz recording before submitting.");
    if (recorder.state !== "recording") throw new Error("The camera recording stopped before the quiz was submitted. Restart the quiz recording.");

    recordingDurationMsRef.current = Math.max(1, Date.now() - (recordingStartedAtRef.current ?? Date.now()));
    await new Promise<void>((resolve, reject) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.addEventListener("error", () => reject(new Error("The camera recording could not be finalized.")), { once: true });
      try {
        recorder.requestData();
        recorder.stop();
      } catch (caught) {
        reject(caught instanceof Error ? caught : new Error("The camera recording could not be finalized."));
      }
    });

    await videoChunkUploadQueueRef.current;
    if (videoChunkUploadErrorRef.current) {
      throw new Error(`The complete camera video is not saved yet. ${videoChunkUploadErrorRef.current} Restart the quiz recording before submitting.`);
    }
    if (!recordingIdRef.current) throw new Error("The camera recording session is missing. Restart the quiz recording before submitting.");

    const mimeType = recorder.mimeType || recordedChunksRef.current.find((chunk) => chunk.type)?.type || "video/webm";
    const recording = new Blob(recordedChunksRef.current, { type: mimeType });
    if (!recording.size) throw new Error("The camera recording is empty. Restart the quiz recording and try again.");
    pendingRecordingRef.current = recording;
    mediaRecorderRef.current = null;
    releaseCamera();
    return recording;
  };

  const handleLogout = () => {
    void discardCurrentRecording();
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userData");
    localStorage.removeItem("userEmail");
    router.push("/");
  };

  const selectOption = (questionId: number, selectedOption: number) => {
    if (!interviewId || result || busy) return;
    setError("");
    setAnswers((current) => ({ ...current, [questionId]: selectedOption }));
    setSaveStatus("Saving your selections…");
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch("/api/interview/react-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewId, action: "save", questionId, selectedOption }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not save this answer.");
        setSaveStatus("All selected answers saved");
      })
      .catch((caught: unknown) => {
        setSaveStatus("Progress could not be saved");
        setError(caught instanceof Error ? caught.message : "Could not save this answer.");
      });
  };

  const submitQuiz = async () => {
    if (!interviewId || busy || result) return;
    const firstMissing = quizQuestions.find((question) => !Number.isInteger(answers[question.id]));
    if (firstMissing) {
      setError("Please choose an answer for all 20 questions before submitting.");
      document.getElementById(`react-quiz-question-${firstMissing.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setBusy(true);
    setError("");
    try {
      await saveQueueRef.current;
      const recording = await finishRecording();
      const form = new FormData();
      form.append("interviewId", interviewId);
      form.append("action", "submit");
      if (!recordingIdRef.current) throw new Error("The camera recording session is missing. Restart the quiz recording before submitting.");
      form.append("recordingId", recordingIdRef.current);
      form.append("videoChunkCount", String(videoChunkIndexRef.current));
      form.append("answers", JSON.stringify(
        quizQuestions.map((question) => ({ questionId: question.id, selectedOption: answers[question.id] })),
      ));
      form.append("videoDurationMs", String(recordingDurationMsRef.current));
      const extension = recording.type.toLowerCase().includes("mp4") ? "mp4" : "webm";
      form.append("video", recording, `react-mcq-${interviewId}.${extension}`);
      const response = await fetch("/api/interview/react-quiz", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not submit the React quiz and video.");
      setResult({ score: payload.score, total: payload.total, submittedAt: payload.submittedAt, videoUrl: payload.videoUrl ?? null });
      setSaveStatus("Quiz answers and camera recording saved");
      setRecordingSaveStatus("Camera recording and assessment data saved");
      recordingIdRef.current = null;
      setConfirmOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit the React quiz.");
    } finally {
      setBusy(false);
    }
  };

  const requestSubmit = () => {
    if (!pendingRecordingRef.current && (!cameraReady || mediaRecorderRef.current?.state !== "recording")) {
      setError("Keep the camera connected and recording through the whole quiz. Restart the quiz recording before submitting.");
      setCameraError("Recording is not active. Restart the quiz to record every question.");
      return;
    }
    const firstMissing = quizQuestions.find((question) => !Number.isInteger(answers[question.id]));
    if (firstMissing) {
      setError("Please choose an answer for all 20 questions before submitting.");
      document.getElementById(`react-quiz-question-${firstMissing.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError("");
    setConfirmOpen(true);
  };

  const answeredCount = Object.keys(answers).length;
  const allQuestionsAnswered = quizQuestions.length > 0 && answeredCount === quizQuestions.length;
  const remaining = 30 * 60 - elapsed;
  const timeLabel = `${String(Math.floor(Math.max(0, remaining) / 60)).padStart(2, "0")}:${String(Math.max(0, remaining) % 60).padStart(2, "0")}`;

  if (loading) return <SukiPageLoader caption="Preparing the React quiz" />;

  return (
    <div className="fixed inset-0 flex min-h-0 overflow-hidden overscroll-none bg-white text-slate-900">
      <Sidebar
        current={3}
        name={candidateName}
        micReady={false}
        cameraReady={cameraReady}
        cameraLabel={cameraStream?.getVideoTracks()[0]?.label}
        userDetails={userDetails}
        timeLeft={remaining}
        navigationDisabled={quizStarted && !result}
        onLogout={quizStarted && !result ? undefined : handleLogout}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col m-3 lg:ml-0 rounded-[28px] border border-slate-200 bg-white overflow-hidden">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white sm:flex">
              <Code2 size={24} />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-slate-900 sm:text-xl">{STEPS[3].fullLabel}</h1>
              <p className="text-xs text-slate-500">Stage 4 of {STEPS.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold tabular-nums text-slate-700 sm:px-4">
            <Clock size={16} className="text-blue-600" /> {timeLabel}
          </div>
        </header>

        <div className="h-1 bg-slate-100 lg:hidden">
          <div className="h-full bg-blue-600" style={{ width: "100%" }} />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/60">
          <div className="mx-auto max-w-7xl space-y-4 px-4 py-3 sm:px-8 sm:py-4">
            <section className={`${card} overflow-hidden`}>
              <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 px-6 py-6 text-white sm:px-9 sm:py-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">Next assessment stage</p>
                <h2 className="font-display mt-3 text-3xl font-bold sm:text-4xl">React Knowledge Check</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
                  Answer 20 React multiple-choice questions. Your camera recording stays on for the entire quiz and is saved with your final submission.
                </p>
              </div>

              <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-8 sm:py-5">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-slate-800">Progress</span>
                    <span className="tabular-nums text-slate-600">{answeredCount} of {quizQuestions.length} answered</span>
                  </div>
                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label="Quiz progress"
                    aria-valuemin={0}
                    aria-valuemax={quizQuestions.length}
                    aria-valuenow={answeredCount}
                  >
                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${quizQuestions.length ? (answeredCount / quizQuestions.length) * 100 : 0}%` }} />
                  </div>
                  <p aria-live="polite" className="mt-2 text-xs text-slate-500">{saveStatus}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <CheckCircle2 size={18} className="text-emerald-600" /> One answer per question
                </div>
              </div>
            </section>

            {!result && !quizStarted && (
              <section className={`${card} overflow-hidden`}>
                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                  <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Camera size={24} /></span>
                    <div>
                      <h3 className="font-display text-xl font-bold text-slate-900">Camera recording is required</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Allow camera access to start. Your video records continuously from question 1 through submission and is stored with this assessment.
                      </p>
                      {Object.keys(answers).length > 0 && (
                        <p className="mt-2 text-sm font-medium text-amber-800">
                          Starting a new recording clears the {Object.keys(answers).length} saved answer{Object.keys(answers).length === 1 ? "" : "s"} so the video covers the complete quiz.
                        </p>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => void startQuizWithCamera()} disabled={cameraStarting || !interviewId} className={`${btnPrimary} shrink-0`}>
                    <Video size={17} /> {cameraStarting ? "Starting camera…" : "Allow camera and start"}
                  </button>
                </div>
                {cameraError && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-800 sm:px-7">{cameraError}</p>}
              </section>
            )}

            {!result && quizStarted && !cameraReady && !pendingRecordingRef.current && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6" role="alert">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-amber-950">Camera recording stopped</h3>
                    <p className="mt-1 text-sm leading-6 text-amber-900">
                      {cameraError || "The recording must stay active for the complete quiz."} Restarting clears the current answers so the new video covers the whole assessment.
                    </p>
                  </div>
                  <button type="button" onClick={() => void startQuizWithCamera(true)} disabled={cameraStarting || busy} className={`${btnPrimary} shrink-0`}>
                    <Video size={17} /> {cameraStarting ? "Restarting…" : "Restart quiz recording"}
                  </button>
                </div>
              </section>
            )}

            {!result && quizStarted && !cameraReady && pendingRecordingRef.current && (
              <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6" role="status">
                <h3 className="font-display text-lg font-bold text-blue-950">Recording ready to submit</h3>
                <p className="mt-1 text-sm leading-6 text-blue-900">The full quiz video is ready. If the previous save did not finish, use the submission button below to retry with this recording.</p>
              </section>
            )}

            {error && <ErrorNote>{error}</ErrorNote>}

            {result && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8" role="status">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Trophy size={24} /></span>
                    <div>
                      <h3 className="font-display text-2xl font-bold text-emerald-950">React quiz complete</h3>
                      <p className="mt-1 text-sm text-emerald-900">Your result is saved. Both assessment stages are now submitted.</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white px-6 py-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your score</p>
                    <p className="mt-1 font-display text-3xl font-bold text-emerald-700">{result.score} <span className="text-lg text-slate-500">/ {result.total}</span></p>
                  </div>
                  </div>
                {result.videoUrl && (
                  <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-200 bg-slate-950">
                    <video src={result.videoUrl} controls playsInline className="mx-auto max-h-[420px] w-full" aria-label="Saved React quiz camera recording" />
                  </div>
                )}
              </section>
            )}

            <div className={`grid gap-4 ${!result && quizStarted && cameraReady ? "xl:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
            <div className="min-w-0 space-y-4">
            {(quizStarted || result) && <div className="space-y-3">
              {quizQuestions.map((question, questionIndex) => (
                <fieldset
                  id={`react-quiz-question-${question.id}`}
                  key={question.id}
                  disabled={Boolean(result) || busy || !cameraReady}
                  className={`${card} scroll-mt-6 p-4 sm:p-5`}
                >
                  <legend className="sr-only">Question {questionIndex + 1}: {question.question}</legend>
                  <div className="mb-5 flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">{questionIndex + 1}</span>
                    <h3 className="pt-1 text-base font-semibold leading-6 text-slate-900 sm:text-lg">{question.question}</h3>
                  </div>
                  <div className="ml-0 grid gap-3 sm:ml-12">
                    {question.options.map((option, optionIndex) => {
                      const selected = answers[question.id] === optionIndex;
                      const letter = String.fromCharCode(65 + optionIndex);
                      return (
                        <label
                          key={`${question.id}-${optionIndex}`}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                            selected
                              ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
                              : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                          } ${result || busy ? "cursor-default" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`react-question-${question.id}`}
                            value={optionIndex}
                            checked={selected}
                            onChange={() => selectOption(question.id, optionIndex)}
                            className="mt-1 size-4 accent-blue-600"
                          />
                          <span className={`grid size-6 shrink-0 place-items-center rounded-lg text-xs font-bold ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{letter}</span>
                          <span className="text-sm leading-6 text-slate-700">{option}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>}

            {(quizStarted || result) && <section className={`${card} flex flex-col gap-4 p-5 pb-4 sm:flex-row sm:items-center sm:justify-between sm:p-7 sm:pb-5 ${allQuestionsAnswered && !result ? "border-emerald-200 bg-emerald-50/70" : ""}`}>
              <div>
                <h3 className={`font-display text-lg font-bold ${allQuestionsAnswered && !result ? "text-emerald-950" : "text-slate-900"}`}>
                  {result ? "All done" : allQuestionsAnswered ? "All questions completed" : "Assessment in progress"}
                </h3>
                <p className={`mt-1 text-sm ${allQuestionsAnswered && !result ? "text-emerald-900" : "text-slate-600"}`}>
                  {result
                    ? "Your quiz score and answers have been saved."
                    : allQuestionsAnswered
                      ? `You answered all ${quizQuestions.length} questions. Submit all answers to finish both assessments.`
                      : `${quizQuestions.length - answeredCount} question${quizQuestions.length - answeredCount === 1 ? "" : "s"} remaining. Answer every question to enable submission.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {result ? (
                  <>
                    <Link href="/" className={btnSecondary}><Home size={17} /> Back to home</Link>
                    <Link href="/interview" className={btnPrimary}>Start another assessment <ArrowRight size={17} /></Link>
                  </>
                ) : (
                  <button type="button" onClick={requestSubmit} disabled={busy || !allQuestionsAnswered || (!cameraReady && !pendingRecordingRef.current)} className={btnPrimary}>
                    {pendingRecordingRef.current ? "Retry final submission" : allQuestionsAnswered ? "Submit all answers" : "Complete all questions to submit"} <ArrowRight size={17} />
                  </button>
                )}
              </div>
            </section>}
            </div>

            {!result && quizStarted && cameraReady && (
              <aside className="sticky top-0 z-20 order-first self-start xl:order-none xl:top-4">
                <section className={`${card} grid grid-cols-[minmax(0,1fr)_112px] items-center gap-3 p-3 xl:block xl:p-4`}>
                  <div className="order-2 overflow-hidden rounded-xl bg-slate-950 xl:order-none">
                    <video ref={cameraPreviewRef} autoPlay muted playsInline className="aspect-video w-full object-cover" aria-label="Live camera preview" />
                  </div>
                  <div className="order-1 min-w-0 xl:order-none xl:mt-3">
                    <p className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 sm:text-xs">
                      <span className="size-2 animate-pulse rounded-full bg-rose-600" /> Recording
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 xl:mt-3 xl:text-sm xl:leading-6">Camera stays on through every question and final submission.</p>
                    <p aria-live="polite" className="mt-1 text-[11px] font-medium leading-4 text-blue-700 xl:mt-2">{recordingSaveStatus}</p>
                  </div>
                </section>
              </aside>
            )}
            </div>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit both assessments?"
        confirmLabel="Submit both assessments"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void submitQuiz()}
      >
        This saves your interactive responses, all 20 React answers, your quiz score and the full camera recording as the final assessment submission. You cannot change your answers after submitting.
      </ConfirmDialog>
    </div>
  );
}

export default function ReactQuizPage() {
  return (
    <Suspense fallback={<SukiPageLoader caption="Preparing the React quiz" />}>
      <ReactQuizContent />
    </Suspense>
  );
}
