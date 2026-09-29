import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ListChecks,
  Mic,
  ShieldCheck,
} from "lucide-react";
import { btnPrimary } from "@/lib/ui";

const facts = [
  { icon: Clock, label: "Duration", value: "About 5 minutes" },
  { icon: ListChecks, label: "Questions", value: "4 spoken answers" },
  { icon: Mic, label: "Requirement", value: "Working microphone" },
];

const checklist = [
  "Use a current version of Chrome or Edge.",
  "Choose a quiet place with a stable internet connection.",
  "Allow microphone access when the browser asks.",
  "Keep the page open until the assessment is submitted.",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100">
      <section className="bg-gradient-to-br from-[#0a2540] to-[#12457a] pb-24 text-white">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-blue-600">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">TalentIQ</p>
              <p className="text-[10px] uppercase text-blue-200/80">Assessment Portal</p>
            </div>
          </div>
          <Link
            href="/interview"
            className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            Begin assessment
          </Link>
        </nav>
        <div className="mx-auto max-w-4xl px-4 pt-14 text-center sm:px-6 sm:pt-20">
          <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-blue-100">
            Voice-based screening
          </span>
          <h1 className="mt-6 text-4xl font-bold text-white sm:text-5xl">
            Candidate Interview Assessment
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-blue-100">
            Answer a short set of screening questions by voice. Your audio and transcript are saved as you go.
          </p>
          <Link
            href="/interview"
            className={`${btnPrimary} mt-8 bg-white px-7 py-3.5 text-base !text-[#0a2540] hover:!bg-blue-50`}
          >
            Start assessment <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <main className="mx-auto -mt-14 max-w-5xl space-y-5 px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {facts.map(({ icon: Icon, label, value }) => (
            <article key={label} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="grid size-11 place-items-center rounded-lg bg-blue-50 text-blue-800">
                <Icon size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs uppercase text-slate-500">{label}</p>
                <p className="font-semibold text-slate-900">{value}</p>
              </div>
            </article>
          ))}
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Before you begin</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        TalentIQ Assessment Portal · Built with Next.js and MongoDB
      </footer>
    </div>
  );
}