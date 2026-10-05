"use client";

import { AlertTriangle } from "lucide-react";
import { btnPrimary } from "@/lib/ui";

export default function InterviewError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-white grid place-items-center px-4 py-20">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-700">
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          An unexpected error occurred. Your saved answers remain in your session.
        </p>
        <button type="button" onClick={reset} className={`${btnPrimary} mt-6`}>
          Try again
        </button>
      </div>
    </main>
  );
}
