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
  Code2,
  X,
} from "lucide-react";
import Image from "next/image";
import { type UserDetails } from "@/components/UserDetailsModal";

export const STEPS = [
  { fullLabel: "Audio & Video Check", icon: Video },
  { fullLabel: "Interactive Assessment", icon: ClipboardList },
  { fullLabel: "Results & Submission", icon: Flag },
  { fullLabel: "React MCQ Quiz", icon: Code2 },
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
  timeLeft?: number;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  navigationDisabled?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  timeLeft,
  onOpenProfile,
  onLogout,
  navigationDisabled = false,
  mobileOpen = false,
  onCloseMobile,
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
  const displayedStage = Math.min(current + 1, STEPS.length);

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const renderContent = (isMobile = false) => (
    <>
      <div className="border-b border-white/10 px-5 pb-4 pt-5">
        <div className="flex items-center justify-between">
          {navigationDisabled ? (
            <div aria-label="Suki Software Solutions" className="flex items-center rounded-xl bg-white/95 px-3 py-1.5 shadow-xl shadow-blue-950/40">
              <Image
                src="/suki-logo-cropped.png"
                alt="Suki Software Solutions"
                width={130}
                height={45}
                className="h-7 w-auto object-contain"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (isMobile) onCloseMobile?.();
                window.location.href = '/';
              }}
              className="flex items-center rounded-xl bg-white/95 px-3 py-1.5 shadow-xl shadow-blue-950/40 transition-all duration-200 hover:bg-white hover:scale-[1.02] active:scale-[0.98]"
            >
              <Image
                src="/suki-logo-cropped.png"
                alt="Suki Software Solutions"
                width={130}
                height={45}
                className="h-7 w-auto object-contain"
              />
            </button>
          )}

          {isMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close menu"
              className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95 transition"
            >
              <X size={18} />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-bold text-sky-100 shadow-sm">
              <span className="size-1.5 rounded-full bg-sky-300" />
              Candidate portal
            </span>
          )}
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/65">Interactive assessment</p>
      </div>

      <div className="border-b border-white/10 px-4 py-4">
        <button
          type="button"
          onClick={() => {
            if (isMobile) onCloseMobile?.();
            onOpenProfile?.();
          }}
          disabled={!onOpenProfile}
          aria-label={`Open profile for ${displayName}`}
          className="group relative flex min-h-16 w-full items-center gap-3 rounded-2xl border border-blue-300/15 bg-[#12315f] p-3 text-left transition-all duration-200 hover:border-sky-300/35 hover:bg-[#183d72] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-default disabled:opacity-100 disabled:hover:border-blue-300/15 disabled:hover:bg-[#12315f] disabled:hover:shadow-none"
        >
          <div className="relative shrink-0">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 via-blue-400 to-indigo-400 text-lg font-bold text-blue-950 shadow-lg shadow-blue-950/30 ring-2 ring-sky-100/10">
              {initial}
            </div>
            <div className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-emerald-400 text-emerald-950 ring-2 ring-[#0b2552] shadow-lg">
              <Check size={12} className="stroke-[3]" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate group-hover:text-sky-100 transition-colors">{displayName}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-sky-200">{role}</p>
            <p className="mt-0.5 truncate text-[11px] text-blue-100/60">{emailVal}</p>
          </div>

          <ChevronRight size={16} className="shrink-0 text-blue-100/45 transition-all group-hover:translate-x-0.5 group-hover:text-sky-100" />
        </button>
      </div>

      <div className="mx-4 mt-4 space-y-2 rounded-2xl border border-white/10 bg-[#07172f]/55 p-4 shadow-inner shadow-blue-950/30">
        <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100/55">Session status</p>
        <div className="flex items-center justify-between border-b border-white/10 py-2.5">
          <span className="flex items-center gap-2 text-xs font-medium text-blue-100/70">
            <Radio size={14} className="text-sky-400" />
            {timeLeft !== undefined ? "Time limit remaining" : "Session time"}
          </span>
          <span className="rounded-lg border border-sky-300/15 bg-blue-400/10 px-2.5 py-1 font-mono text-sm font-bold tabular-nums text-sky-100">{fmtTime(timeLeft !== undefined ? Math.max(0, timeLeft) : elapsed)}</span>
        </div>

        <div className="flex items-center justify-between border-b border-white/10 py-2.5">
          <span className="flex items-center gap-2 text-xs font-medium text-blue-100/70">
            <Mic size={14} className={micReady ? "text-sky-300" : "text-slate-400"} />
            Microphone
          </span>
          <span className={`flex items-center gap-1.5 text-xs font-bold ${micReady ? "text-emerald-300" : "text-slate-300/75"}`}>
            <span className={`size-2 rounded-full ${micReady ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-slate-400"}`} />
            {micReady ? "Ready" : "Standby"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-white/10 py-2.5">
          <span className="flex items-center gap-2 text-xs font-medium text-blue-100/70">
            <Video size={14} className={cameraReady ? "text-sky-400" : "text-slate-500"} />
            Camera
          </span>
          <span className={`max-w-[140px] truncate text-right text-xs font-bold ${cameraReady ? "text-emerald-300" : "text-slate-400"}`}>
            {cameraReady ? cameraLabel || "Ready" : "Standby"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 py-2.5">
          <span className="flex items-center gap-2 text-xs font-medium text-blue-100/70">
            <Cpu size={14} className="text-sky-400" />
            Speech input
          </span>
          <span className="rounded-lg border border-sky-300/15 bg-sky-300/10 px-2.5 py-1 font-mono text-xs font-bold text-sky-100">English only</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-5">
        <div className="mb-4 flex items-center justify-between px-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100/55">Assessment stages</p>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-bold text-blue-50/80">
            {String(displayedStage).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          </span>
        </div>
        <ol className="space-y-2.5">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const complete = index < current;
            const active = index === current;

            return (
              <li
                key={step.fullLabel}
                aria-current={active ? "step" : undefined}
                className={`relative flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200 ${
                  active
                    ? "border border-sky-300/30 bg-gradient-to-r from-blue-500/30 via-sky-400/15 to-indigo-500/20 shadow-[0_8px_24px_rgba(37,99,235,0.2)]"
                    : complete
                    ? "bg-gradient-to-br from-emerald-600/20 to-emerald-900/10 border border-emerald-500/30"
                    : "border border-white/[0.07] bg-white/[0.025] hover:border-sky-300/15 hover:bg-white/[0.05]"
                }`}
              >
                <span
                  className={`shrink-0 flex size-10 items-center justify-center rounded-xl shadow-lg ${
                    complete
                      ? "bg-gradient-to-br from-emerald-400 to-emerald-500 text-slate-900"
                      : active
                      ? "bg-gradient-to-br from-sky-300 via-blue-400 to-indigo-500 text-slate-900 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                    : "bg-white/[0.08] text-blue-100/45"
                  }`}
                >
                  {complete ? <Check size={18} strokeWidth={2.5} /> : <Icon size={18} />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold leading-tight ${active ? "text-white" : complete ? "text-emerald-200" : "text-blue-50/75"}`}>
                    {step.fullLabel}
                  </p>
                  <p className={`mt-1 text-[11px] font-semibold ${active ? "text-sky-200" : complete ? "text-emerald-300" : "text-blue-100/45"}`}>
                    {complete ? "Completed" : active ? "In progress" : "Pending"}
                  </p>
                  {active && index === 1 && (
                    <div className="mt-3">
                      <span className="mb-1.5 block text-[10px] font-semibold text-blue-100/65">Question {Math.min(questionIndex + 1, totalQuestions)} of {totalQuestions}</span>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-white/10"
                        role="progressbar"
                        aria-label="Assessment question progress"
                        aria-valuemin={0}
                        aria-valuemax={Math.max(1, totalQuestions)}
                        aria-valuenow={Math.max(0, Math.min(questionIndex + 1, totalQuestions))}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-400 transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                          style={{ width: `${Math.max(0, Math.min(100, ((questionIndex + 1) / Math.max(1, totalQuestions)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="shrink-0 space-y-3 border-t border-white/10 px-4 py-5">
        {navigationDisabled ? (
          <button
            type="button"
            disabled
            className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-center text-xs font-bold text-slate-300"
          >
            <Home size={16} />
            Finish the recording to leave
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isMobile) onCloseMobile?.();
              window.location.href = '/';
            }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-400 bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-950/25 transition-all duration-200 hover:border-blue-300 hover:bg-blue-500 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            <Home size={16} />
            Back to home
          </button>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={() => {
              if (isMobile) onCloseMobile?.();
              onLogout();
            }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-300/20 bg-[#10264d] px-4 py-3 text-sm font-bold text-blue-50 shadow-sm transition-all duration-200 hover:border-rose-400 hover:bg-rose-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
          >
            <LogOut size={14} />
            Sign out
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex min-h-0 w-80 shrink-0 flex-col m-3 overflow-y-auto overflow-x-hidden rounded-[26px] border border-sky-300/20 bg-gradient-to-b from-[#0a1b3d] via-[#0b2552] to-[#081832] text-slate-100 shadow-[0_20px_55px_rgba(8,27,62,0.32)]">
        {renderContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop Scrim */}
      <div
        className={`fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* Mobile Slide-in Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-[120] flex w-80 max-w-[85vw] flex-col bg-gradient-to-b from-[#0a1b3d] via-[#0b2552] to-[#081832] text-slate-100 shadow-2xl transition-transform duration-300 ease-out lg:hidden overflow-y-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-label="Candidate assessment mobile navigation"
      >
        {renderContent(true)}
      </aside>
    </>
  );
}
