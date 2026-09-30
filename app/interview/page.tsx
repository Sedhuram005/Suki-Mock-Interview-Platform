"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Download, Info, Loader2, Timer, WifiOff } from "lucide-react";
import { questions } from "@/lib/questions";
import { blobToBase64 } from "@/lib/blobToBase64";
import { getDeviceInfo } from "@/lib/deviceInfo";
import { btnPrimary, btnSecondary, card, input } from "@/lib/ui";
import MicPermission from "@/components/MicPermission";
import Recorder, { type AnswerData } from "@/components/Recorder";
import Sidebar, { STEPS } from "@/components/Sidebar";
import ErrorNote from "@/components/ErrorNote";
import ConfirmDialog from "@/components/ConfirmDialog";

const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function InterviewPage() {
  const [name, setName] = useState("");
  const [detailsDone, setDetailsDone] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<AnswerData>({ blob: null, transcript: "" });
  const [submitted, setSubmitted] = useState<{ q: string; t: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [online, setOnline] = useState(true);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // release the microphone when leaving the page
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

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
    setOnline(navigator.onLine);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const stepIndex = done ? 3 : interviewId ? 2 : detailsDone ? 1 : 0;

  // move focus to the question heading on each new question (screen readers, keyboard users)
  useEffect(() => {
    if (stepIndex === 2) headingRef.current?.focus();
  }, [index, stepIndex]);

  // create the session once the microphone is verified, including device metadata
  const startInterview = async () => {
    if (!stream) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionName: name.trim(), device: getDeviceInfo(stream) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInterviewId(data.interviewId);
    } catch (e: any) {
      setError(e.message || "Could not start the interview. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    const { blob, transcript } = answer;
    if (!blob || !interviewId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/interview/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          questionId: current.id,
          questionText: current.text,
          audioBase64: await blobToBase64(blob),
          transcript,
          mimeType: blob.type,
          isLast,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted((s) => [...s, { q: current.text, t: transcript }]);
      setAnswer({ blob: null, transcript: "" });
      if (isLast) {
        stream?.getTracks().forEach((t) => t.stop());
        setDone(true);
      } else {
        setIndex((i) => i + 1);
      }
    } catch (e: any) {
      setError(e.message || "Saving failed. Your recording is kept, please try again.");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const restart = () => {
    setName(""); setDetailsDone(false); setInterviewId(null); setStream(null);
    setIndex(0); setAnswer({ blob: null, transcript: "" }); setSubmitted([]);
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
      ...submitted.flatMap((s, i) => [`Q${i + 1}. ${s.q}`, s.t.trim() || "(no transcript)", ""]),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-${refId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef2f7]">
      <Sidebar
        current={done ? 4 : stepIndex}
        name={name}
        refId={refId}
        micReady={!!stream}
        deviceLabel={stream?.getAudioTracks()[0]?.label ?? null}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="hidden h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 sm:flex">
              <StepIcon size={18} />
            </span>
            <div>
              <h1 className="font-display text-base font-bold text-slate-900 sm:text-lg">{STEPS[stepIndex].label}</h1>
              <p className="text-xs text-slate-500">Step {stepIndex + 1} of {STEPS.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {interviewId && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium tabular-nums text-slate-700">
                <Clock size={15} className="text-blue-700" />
                {fmtTime(elapsed)}
              </div>
            )}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b1f3a] text-sm font-semibold text-white">
              {name.trim() ? name.trim()[0].toUpperCase() : "C"}
            </span>
          </div>
        </header>
        <div className="h-1 bg-slate-200 lg:hidden">
          <div className="h-full bg-blue-700 transition-all duration-500" style={{ width: `${((stepIndex + 1) / 4) * 100}%` }} />
        </div>

        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
            <WifiOff size={16} /> You are offline. Reconnect to save your answers, and keep this page open.
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-8">
            {/* Step 1: candidate details */}
            {stepIndex === 0 && (
              <form
                onSubmit={(e) => { e.preventDefault(); if (name.trim()) setDetailsDone(true); }}
                className={`${card} fade-up mx-auto max-w-2xl overflow-hidden`}
              >
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <h2 className="font-display font-bold text-slate-900">Candidate details</h2>
                  <p className="text-sm text-slate-500">Your name is used as the session name for this assessment.</p>
                </div>
                <div className="p-6 sm:p-8">
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700">Full name</label>
                  <input
                    id="name"
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`${input} mt-1.5`}
                  />
                  <button type="submit" disabled={!name.trim()} className={`${btnPrimary} mt-6 w-full sm:w-auto`}>
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Info size={16} className="text-blue-700" /> Instructions
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    <li>The assessment has {questions.length} questions, answered by voice.</li>
                    <li>Each answer can be up to 60 seconds. You may re-record before saving.</li>
                    <li>Do not refresh or close the page until the assessment is complete.</li>
                  </ul>
                </div>
              </form>
            )}

            {/* Step 2: system check */}
            {stepIndex === 1 && (
              <div className="fade-up mx-auto max-w-xl">
                <div className={`${card} p-6 sm:p-8`}>
                  <MicPermission onGranted={setStream} onContinue={startInterview} continuing={busy} />
                  {error && <ErrorNote>{error}</ErrorNote>}
                </div>
                <button
                  onClick={() => setDetailsDone(false)}
                  disabled={busy}
                  className="mt-4 text-sm font-medium text-slate-500 transition hover:text-slate-800"
                >
                  &larr; Edit candidate details
                </button>
              </div>
            )}

            {/* Step 3: interview */}
            {stepIndex === 2 && (
              <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
                <section key={current.id} className={`${card} fade-up overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Section A · Screening</span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      Question {index + 1} of {questions.length}
                    </span>
                  </div>
                  <div className="p-6 sm:p-8">
                    <h2
                      ref={headingRef}
                      tabIndex={-1}
                      className="font-display text-2xl font-bold leading-snug text-slate-900 outline-none sm:text-3xl"
                    >
                      {current.text}
                    </h2>
                    <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <Timer size={15} /> Suggested answer time: 30 to 60 seconds
                    </p>
                    <div className="mt-6">
                      <Recorder key={current.id} stream={stream!} onChange={setAnswer} />
                    </div>
                    {error && <ErrorNote>{error}</ErrorNote>}
                  </div>
                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500" aria-live="polite">
                      {!online ? "Offline: reconnect to continue." : answer.blob ? "Answer ready to save." : "Record your answer to continue."}
                    </p>
                    <button
                      onClick={isLast ? () => setConfirmOpen(true) : next}
                      disabled={!answer.blob || busy || !online}
                      className={btnPrimary}
                    >
                      {busy && !confirmOpen ? (
                        <><Loader2 size={16} className="animate-spin" /> Saving...</>
                      ) : isLast ? (
                        "Review and submit"
                      ) : (
                        <>Next question <ArrowRight size={16} /></>
                      )}
                    </button>
                  </div>
                </section>

                <aside className="space-y-6">
                  <div className={`${card} p-5`}>
                    <h3 className="text-sm font-semibold text-slate-900">Question palette</h3>
                    <div className="mt-4 grid grid-cols-5 gap-2">
                      {questions.map((q, i) => (
                        <div
                          key={q.id}
                          className={`flex h-10 items-center justify-center rounded-md text-sm font-semibold ${
                            i < index
                              ? "bg-emerald-500 text-white"
                              : i === index
                              ? "bg-blue-700 text-white ring-4 ring-blue-100"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-3 text-center">
                      <div className="rounded-lg bg-emerald-50 py-2.5">
                        <dd className="font-display text-xl font-bold text-emerald-700">{answered}</dd>
                        <dt className="text-xs text-emerald-700/80">Answered</dt>
                      </div>
                      <div className="rounded-lg bg-slate-100 py-2.5">
                        <dd className="font-display text-xl font-bold text-slate-700">{questions.length - answered}</dd>
                        <dt className="text-xs text-slate-500">Remaining</dt>
                      </div>
                    </dl>
                    <ul className="mt-5 space-y-2 text-xs text-slate-500">
                      <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500" /> Answered</li>
                      <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-blue-700" /> Current</li>
                      <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-slate-200" /> Not visited</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                      <Info size={16} /> Guidelines
                    </h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-blue-900/80">
                      <li>Speak clearly at a steady pace.</li>
                      <li>Check the transcript and fix any mistakes.</li>
                      <li>Answers cannot be changed after saving.</li>
                    </ul>
                  </div>
                </aside>
              </div>
            )}

            {/* Completion */}
            {done && (
              <div className={`${card} fade-up mx-auto max-w-3xl overflow-hidden`}>
                <div className="bg-gradient-to-br from-[#0b1f3a] to-[#12457a] px-6 py-10 text-center text-white">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
                    <CheckCircle2 size={36} />
                  </span>
                  <h2 className="font-display mt-4 text-2xl font-bold">Assessment submitted</h2>
                  <p className="mt-1 text-sm text-blue-100">Thank you, {name}. Your responses have been recorded.</p>
                </div>
                <dl className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-b border-slate-200 text-center text-sm sm:grid-cols-4 sm:divide-y-0">
                  {[
                    ["Reference ID", refId ?? "-"],
                    ["Answers saved", String(questions.length)],
                    ["Time taken", fmtTime(elapsed)],
                    ["Status", "Completed"],
                  ].map(([k, v]) => (
                    <div key={k} className="px-4 py-5">
                      <dt className="text-xs text-slate-500">{k}</dt>
                      <dd className={`mt-1 font-semibold ${k === "Status" ? "text-emerald-600" : "text-slate-900"}`}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-slate-900">Your responses</h3>
                    <button onClick={downloadTranscript} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 transition hover:text-blue-900">
                      <Download size={15} /> Download transcript
                    </button>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {submitted.map((s, i) => (
                      <li key={i} className="rounded-lg border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Question {i + 1}</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{s.q}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {s.t.trim() || <span className="italic text-slate-400">No transcript</span>}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col justify-center gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row">
                  <Link href="/" className={btnSecondary}>Back to home</Link>
                  <button onClick={restart} className={btnPrimary}>Start another assessment</button>
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
    </div>
  );
}
