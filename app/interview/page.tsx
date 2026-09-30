"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Download, Info, Loader2, Timer, WifiOff, Mic, User, ShieldCheck, ClipboardList, Flag } from "lucide-react";
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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <Sidebar
        current={done ? 4 : stepIndex}
        name={name}
        refId={refId}
        micReady={!!stream}
        deviceLabel={stream?.getAudioTracks()[0]?.label ?? null}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200/50 bg-white/80 backdrop-blur-xl px-4 sm:px-8 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
              <StepIcon size={24} />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900 sm:text-xl">{STEPS[stepIndex].label}</h1>
              <p className="text-xs text-slate-500">Step {stepIndex + 1} of {STEPS.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {interviewId && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold tabular-nums text-slate-700 shadow-sm">
                <Clock size={16} className="text-blue-600" />
                {fmtTime(elapsed)}
              </div>
            )}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-500/25">
              {name.trim() ? name.trim()[0].toUpperCase() : "C"}
            </div>
          </div>
        </header>
        
        <div className="h-1 bg-slate-200 lg:hidden">
          <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500" style={{ width: `${((stepIndex + 1) / 4) * 100}%` }} />
        </div>

        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-3 text-sm font-semibold text-amber-900 shadow-sm">
            <WifiOff size={18} className="text-amber-600" /> You are offline. Reconnect to save your answers, and keep this page open.
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-8">
            {/* Step 1: candidate details */}
            {stepIndex === 0 && (
              <form
                onSubmit={(e) => { e.preventDefault(); if (name.trim()) setDetailsDone(true); }}
                className={`${card} fade-up mx-auto max-w-2xl overflow-hidden shadow-xl`}
              >
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
                      <User size={24} />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold text-slate-900">Candidate Details</h2>
                      <p className="text-sm text-slate-600">Your name is used as the session name for this assessment.</p>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700">Full Name</label>
                  <input
                    id="name"
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`${input} mt-2 text-base`}
                  />
                  <button type="submit" disabled={!name.trim()} className={`${btnPrimary} mt-6 w-full sm:w-auto px-8 py-3 text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30`}>
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-6">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Info size={18} className="text-blue-600" /> Instructions
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {[
                      "The assessment has 4 questions, answered by voice.",
                      "Each answer can be up to 60 seconds. You may re-record before saving.",
                      "Do not refresh or close the page until the assessment is complete.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </form>
            )}

            {/* Step 2: system check */}
            {stepIndex === 1 && (
              <div className="fade-up mx-auto max-w-xl">
                <div className={`${card} p-8 shadow-xl`}>
                  <MicPermission onGranted={setStream} onContinue={startInterview} continuing={busy} />
                  {error && <ErrorNote>{error}</ErrorNote>}
                </div>
                <button
                  onClick={() => setDetailsDone(false)}
                  disabled={busy}
                  className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
                >
                  <ArrowRight size={16} className="rotate-180" /> Edit candidate details
                </button>
              </div>
            )}

            {/* Step 3: interview */}
            {stepIndex === 2 && (
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
                    <div className="mt-8">
                      <Recorder key={current.id} stream={stream!} onChange={setAnswer} />
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
                        "Check the transcript and fix any mistakes.",
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
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display text-xl font-bold text-slate-900">Your Responses</h3>
                    <button onClick={downloadTranscript} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-105">
                      <Download size={18} /> Download Transcript
                    </button>
                  </div>
                  <ul className="space-y-4">
                    {submitted.map((s, i) => (
                      <li key={i} className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-sm font-bold">
                            {i + 1}
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Question {i + 1}</p>
                        </div>
                        <p className="text-base font-semibold text-slate-900 mb-2">{s.q}</p>
                        <p className="text-sm leading-relaxed text-slate-600">
                          {s.t.trim() || <span className="italic text-slate-400">No transcript</span>}
                        </p>
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
    </div>
  );
}
