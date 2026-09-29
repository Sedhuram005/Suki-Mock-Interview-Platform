"use client";

import { AlertTriangle } from "lucide-react";
import { btnPrimary } from "@/lib/ui";

export default function InterviewError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-700">
        <AlertTriangle size={28} aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        An unexpected error occurred. Your saved answers remain in your session.
      </p>
      <button type="button" onClick={reset} className={`${btnPrimary} mt-6`}>
        Try again
      </button>
    </main>
  );
}