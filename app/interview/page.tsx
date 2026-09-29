"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Info, LoaderCircle } from "lucide-react";
import { questions } from "@/lib/questions";
import { blobToBase64 } from "@/lib/blobToBase64";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";
import MicPermission from "@/components/MicPermission";
import Recorder, { type AnswerData } from "@/components/Recorder";
import Sidebar, { STEPS } from "@/components/Sidebar";
import ErrorNote from "@/components/ErrorNote";

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

type ApiError = { error?: string };

export default function InterviewPage() {
  const [name, setName] = useState("");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micConfirmed, setMicConfirmed] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<AnswerData>({ blob: null, transcript: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(
    () => () => stream?.getTracks().forEach((track) => track.stop()),
    [stream],
  );

  useEffect(() => {
    if (!interviewId || done) return;
    const startedAt = Date.now();
    const interval = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [interviewId, done]);

  useEffect(() => {
    if (!interviewId || done) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [interviewId, done]);

  const startSession = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionName: name.trim() }),
      });
      const data = (await response.json()) as ApiError & { interviewId?: string };
      if (!response.ok) throw new Error(data.error || "Could not start the interview.");
      if (!data.interviewId) throw new Error("The server did not return an interview ID.");
      setInterviewId(data.interviewId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the interview.");
    } finally {
      setBusy(false);
    }
  };

  const current = questions[index];
  const isLast = index === questions.length - 1;

  const submitAnswer = async () => {
    if (!answer.blob || !interviewId || !current || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/interview/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          questionId: current.id,
          questionText: current.text,
          audioBase64: await blobToBase64(answer.blob),
          transcript: answer.transcript,
          mimeType: answer.blob.type || "audio/webm",
          isLast,
        }),
      });
      const data = (await response.json()) as ApiError & { ok?: boolean };
      if (!response.ok) throw new Error(data.error || "Could not save this answer.");

      setAnswer({ blob: null, transcript: "" });
      if (isLast) {
        stream?.getTracks().forEach((track) => track.stop());
        setDone(true);
      } else {
        setIndex((currentIndex) => currentIndex + 1);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Saving failed. Your recording is kept; please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setName("");
    setInterviewId(null);
    setStream(null);
    setMicConfirmed(false);
    setIndex(0);
    setAnswer({ blob: null, transcript: "" });
    setError("");
    setDone(false);
    setElapsed(0);
  };

  const micReady = Boolean(stream && micConfirmed);
  const stepIndex = done ? STEPS.length : !interviewId ? 0 : !micReady ? 1 : 2;
  const referenceId = interviewId ? interviewId.slice(-8).toUpperCase() : null;
  const answeredCount = index;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] bg-slate-100 lg:h-[calc(100vh-3.5rem)] lg:min-h-0 lg:overflow-hidden">
      <Sidebar
        current={done ? STEPS.length : stepIndex}
        name={name}
        refId={referenceId}
        micReady={micReady}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
          <div>
            <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
              {STEPS[stepIndex]?.label ?? "Completion"}
            </h1>
            <p className="text-xs text-slate-500">
              Step {Math.min(stepIndex + 1, STEPS.length)} of {STEPS.length} · {STEPS[stepIndex]?.hint ?? "Assessment submitted"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {interviewId && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium tabular-nums text-slate-700">
                <Clock size={15} className="text-blue-700" aria-hidden="true" />
                {formatTime(elapsed)}
              </div>
            )}
            <span className="grid size-9 place-items-center rounded-full bg-[#0a2540] text-sm font-semibold text-white" aria-label={name ? `Candidate ${name}` : "Candidate"}>
              {name.trim() ? name.trim()[0].toUpperCase() : "C"}
            </span>
          </div>
        </header>

        <div className="h-1 bg-slate-200 lg:hidden">
          <div
            className="h-full bg-blue-700 transition-[width] duration-500"
            style={{ width: `${((done ? 4 : stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-8">
            {stepIndex === 0 && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (name.trim() && !busy) void startSession();
                }}
                className={`${card} fade-up mx-auto max-w-2xl overflow-hidden`}
              >
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <h2 className="font-semibold text-slate-900">Candidate details</h2>
                  <p className="text-sm text-slate-500">
                    Your name is used as the session name for this assessment.
                  </p>
                </div>
                <div className="p-6">
                  <label htmlFor="candidate-name" className="block text-sm font-medium text-slate-700">
                    Full name
                  </label>
                  <input
                    id="candidate-name"
                    autoFocus
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                  {error && <ErrorNote>{error}</ErrorNote>}
                  <button type="submit" disabled={!name.trim() || busy} className={`${btnPrimary} mt-5 w-full sm:w-auto`}>
                    {busy ? (
                      <><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Starting...</>
                    ) : (
                      <>Save and continue <ArrowRight size={16} aria-hidden="true" /></>
                    )}
                  </button>
                </div>
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Info size={16} className="text-blue-700" aria-hidden="true" /> Instructions
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    <li>The assessment has {questions.length} questions, answered by voice.</li>
                    <li>Each recording can be up to five minutes and can be reviewed before submission.</li>
                    <li>Do not refresh or close the page before submitting the assessment.</li>
                  </ul>
                </div>
              </form>
            )}

            {stepIndex === 1 && (
              <div className={`${card} fade-up mx-auto max-w-xl p-6 sm:p-8`}>
                <MicPermission onGranted={setStream} onContinue={() => setMicConfirmed(true)} />
              </div>
            )}

            {stepIndex === 2 && current && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <section className={`${card} fade-up overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3">
                    <span className="text-xs font-semibold uppercase text-slate-500">Section A · Screening</span>
                    <span className="text-xs font-semibold uppercase text-blue-700">
                      Question {index + 1} / {questions.length}
                    </span>
                  </div>
                  <div className="p-6 sm:p-8">
                    <h2 className="text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                      {current.text}
                    </h2>
                    <div className="mt-6">
                      {stream && <Recorder key={current.id} stream={stream} onChange={setAnswer} />}
                    </div>
                    {error && <ErrorNote>{error}</ErrorNote>}
                  </div>
                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                      {answer.blob ? "Answer ready to submit." : "Record an answer to continue."}
                    </p>
                    <button onClick={submitAnswer} disabled={!answer.blob || busy} className={btnPrimary}>
                      {busy ? (
                        <><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Saving...</>
                      ) : isLast ? (
                        "Submit and finish"
                      ) : (
                        <>Save and next <ArrowRight size={16} aria-hidden="true" /></>
                      )}
                    </button>
                  </div>
                </section>

                <aside className="space-y-5">
                  <section className={`${card} p-5`}>
                    <h2 className="text-sm font-semibold text-slate-900">Question palette</h2>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {questions.map((question, questionIndex) => (
                        <div
                          key={question.id}
                          aria-label={`Question ${questionIndex + 1}: ${questionIndex < index ? "answered" : questionIndex === index ? "current" : "not visited"}`}
                          className={`grid h-10 place-items-center rounded-md text-sm font-semibold ${
                            questionIndex < index
                              ? "bg-emerald-600 text-white"
                              : questionIndex === index
                                ? "bg-blue-700 text-white ring-4 ring-blue-100"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {questionIndex + 1}
                        </div>
                      ))}
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-3 text-center text-sm">
                      <div className="rounded-lg bg-emerald-50 py-2">
                        <dd className="text-lg font-semibold text-emerald-800">{answeredCount}</dd>
                        <dt className="text-xs text-emerald-800/80">Answered</dt>
                      </div>
                      <div className="rounded-lg bg-slate-100 py-2">
                        <dd className="text-lg font-semibold text-slate-700">{questions.length - answeredCount}</dd>
                        <dt className="text-xs text-slate-500">Remaining</dt>
                      </div>
                    </dl>
                    <ul className="mt-5 space-y-2 text-xs text-slate-500">
                      <li className="flex items-center gap-2"><span className="size-3 rounded bg-emerald-600" /> Answered</li>
                      <li className="flex items-center gap-2"><span className="size-3 rounded bg-blue-700" /> Current</li>
                      <li className="flex items-center gap-2"><span className="size-3 rounded bg-slate-200" /> Not visited</li>
                    </ul>
                  </section>
                  <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-950">
                      <Info size={16} aria-hidden="true" /> Guidelines
                    </h2>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-blue-950/80">
                      <li>Speak clearly at a steady pace.</li>
                      <li>Review and correct the transcript before saving.</li>
                      <li>Submitted answers cannot be changed.</li>
                    </ul>
                  </section>
                </aside>
              </div>
            )}

            {done && (
              <section className={`${card} fade-up mx-auto max-w-2xl overflow-hidden text-center`}>
                <div className="bg-[#0a2540] px-6 py-8 text-white">
                  <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-600">
                    <CheckCircle2 size={36} aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold">Assessment submitted</h2>
                  <p className="mt-1 text-sm text-blue-100">
                    Thank you, {name}. Your responses have been recorded.
                  </p>
                </div>
                <dl className="grid grid-cols-2 divide-x divide-y divide-slate-200 text-sm sm:grid-cols-4 sm:divide-y-0">
                  {[
                    ["Reference ID", referenceId ?? "-"],
                    ["Answers saved", String(questions.length)],
                    ["Time taken", formatTime(elapsed)],
                    ["Status", "Completed"],
                  ].map(([label, value]) => (
                    <div key={label} className="px-3 py-5">
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className={`mt-1 break-all font-semibold ${label === "Status" ? "text-emerald-700" : "text-slate-900"}`}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-col justify-center gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row">
                  <Link href="/" className={btnSecondary}>Back to home</Link>
                  <button type="button" onClick={restart} className={btnPrimary}>
                    Start another assessment
                  </button>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}