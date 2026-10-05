"use client";

import {
  Check,
  Flag,
  Mic,
  Video,
  ClipboardList,
  LogOut,
  ChevronRight,
  Home,
  Cpu,
  Radio,
  BadgeCheck,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { type UserDetails } from "@/components/UserDetailsModal";

export const STEPS = [
  { fullLabel: "Audio & Video Check", icon: Video },
  { fullLabel: "Interactive Assessment", icon: ClipboardList },
  { fullLabel: "Results & Submission", icon: Flag },
];

type Props = {
  current: number;
  name: string;
  micReady: boolean;
  cameraReady?: boolean;
  cameraLabel?: string | null;
  userDetails?: UserDetails | null;
  questionIndex?: number;
  totalQuestions?: number;
  elapsed?: number;
  onOpenProfile?: () => void;
  onLogout?: () => void;
};

export default function Sidebar({
  current,
  name,
  micReady,
  cameraReady = false,
  userDetails,
  cameraLabel,
  questionIndex = 0,
  totalQuestions = 4,
  elapsed = 0,
  onOpenProfile,
  onLogout,
}: Props) {
  const profile = userDetails;

  const displayName =
    profile?.name ||
    (profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : name.trim() || "Candidate");

  const role = profile?.profession || "Candidate";
  const emailVal = profile?.email || "";
  const initial = displayName.charAt(0).toUpperCase() || "C";

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <aside className="hidden lg:flex w-80 shrink-0 flex-col m-3 overflow-y-auto overflow-x-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="px-6 pt-6 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/suki-logo-cropped.png"
              alt="Suki Software Solutions"
              width={140}
              height={50}
              className="h-8 w-auto object-contain"
            />
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <BadgeCheck size={12} />
            Verified
          </span>
        </div>
        <p className="mt-1 text-xs font-medium text-slate-500">Candidate portal</p>
      </div>

      <div className="px-4 py-4 border-b border-slate-100">
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:border-blue-200 hover:bg-blue-50/60 cursor-pointer"
        >
          <div className="relative shrink-0">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
              {initial}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
              <Check size={10} className="text-blue-600" strokeWidth={3} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
            <p className="text-xs font-medium text-slate-600 truncate mt-0.5">{role}</p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{emailVal}</p>
          </div>

          <ChevronRight size={16} className="shrink-0 text-slate-400" />
        </button>
      </div>

      <div className="px-6 py-2 border-b border-slate-100">
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Radio size={14} className="text-emerald-600" />
            Session time
          </span>
          <span className="text-sm font-semibold tabular-nums text-slate-900">{fmtTime(elapsed)}</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Mic size={14} className={micReady ? "text-emerald-600" : "text-slate-400"} />
            Microphone
          </span>
          <span className={`text-sm font-semibold ${micReady ? "text-emerald-700" : "text-slate-400"}`}>
            {micReady ? "Ready" : "Standby"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 py-3 border-b border-slate-100">
          <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Video size={14} className={cameraReady ? "text-emerald-600" : "text-slate-400"} />
            Camera
          </span>
          <span className={`max-w-[140px] truncate text-right text-xs font-semibold ${cameraReady ? "text-emerald-700" : "text-slate-400"}`}>
            {cameraReady ? cameraLabel || "Ready" : "Standby"}
          </span>
        </div>

        <div className="flex items-center justify-between py-3">
          <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Cpu size={14} className="text-blue-600" />
            Speech input
          </span>
          <span className="text-sm font-semibold text-slate-800">Any language</span>
        </div>
      </div>

      <div className="px-4 py-4 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-3">
          Interview stages
        </p>
        <div className="space-y-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const complete = index < current;
            const active = index === current;

            return (
              <div
                key={step.fullLabel}
                className={`relative flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${
                  active
                    ? "border-blue-200 bg-blue-50"
                    : complete
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span
                  className={`shrink-0 flex size-9 items-center justify-center rounded-xl ${
                    complete
                      ? "bg-emerald-600 text-white"
                      : active
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {complete ? <Check size={17} strokeWidth={2.5} /> : <Icon size={17} />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold leading-tight ${active ? "text-blue-950" : complete ? "text-emerald-900" : "text-slate-700"}`}>
                    {step.fullLabel}
                  </p>
                  <p className={`text-[11px] mt-0.5 font-medium ${active ? "text-blue-700" : complete ? "text-emerald-700" : "text-slate-400"}`}>
                    {complete ? "Completed" : active ? "In progress" : "Pending"}
                  </p>
                  {active && index === 1 && (
                    <div className="mt-2 h-1 w-full rounded-full bg-blue-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${(questionIndex / totalQuestions) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 space-y-2 shrink-0 border-t border-slate-100">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <Home size={16} className="text-blue-600" />
          Back to home
        </Link>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
