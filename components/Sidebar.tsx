"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Check,
  Flag,
  Mic,
  Video,
  ClipboardList,
  LogOut,
  ArrowRight,
  Code2,
  X,
  Wifi,
  ShieldCheck,
  Lock,
  RefreshCw,
  Zap,
  Signal,
  Home,
  Settings,
  Activity,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { type UserDetails } from "@/components/UserDetailsModal";
import SukiLoadingMark from "@/components/SukiLoadingMark";

export const STEPS = [
  {
    fullLabel: "Audio & Video Check",
    shortLabel: "A/V Check",
    subtitle: "Hardware & media verification",
    icon: Video,
    id: "check",
    stepNumber: "01",
  },
  {
    fullLabel: "Interactive Assessment",
    shortLabel: "Assessment",
    subtitle: "AI voice candidate interview",
    icon: ClipboardList,
    id: "assessment",
    stepNumber: "02",
  },
  {
    fullLabel: "React MCQ Quiz",
    shortLabel: "MCQ Quiz",
    subtitle: "Timed technical evaluation",
    icon: Code2,
    id: "quiz",
    stepNumber: "03",
  },
  {
    fullLabel: "Results & Submission",
    shortLabel: "Results",
    subtitle: "AI scoring report & analytics",
    icon: Flag,
    id: "results",
    stepNumber: "04",
  },
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
  onStartInterview?: () => void;
  onTestMic?: (...args: unknown[]) => Promise<unknown> | void;
  onTestCamera?: (...args: unknown[]) => Promise<unknown> | void;
  onRunAllChecks?: (...args: unknown[]) => Promise<unknown> | void;
  isStarting?: boolean;
  online?: boolean;
};

const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const fmtMinLeft = (s?: number) =>
  s !== undefined ? `${Math.max(1, Math.ceil(s / 60))} min` : "30 min";

/* ─── Section Header ─── */
function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3.5 pt-4 pb-1.5 select-none">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {children}
      </span>
      {action}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                            */
/* ══════════════════════════════════════════════════════════ */
export default function Sidebar({
  current,
  name,
  micReady,
  cameraReady = false,
  cameraLabel,
  userDetails,
  questionIndex = 0,
  totalQuestions = 4,
  elapsed = 0,
  timeLeft,
  onOpenProfile,
  onLogout,
  navigationDisabled = false,
  mobileOpen = false,
  onCloseMobile,
  onStartInterview,
  onTestMic,
  onTestCamera,
  onRunAllChecks,
  isStarting = false,
  online = true,
}: Props) {
  const [testingMic, setTestingMic] = useState(false);
  const [testingCamera, setTestingCamera] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [networkSpeed, setNetworkSpeed] = useState("4G");
  const [collapsed, setCollapsed] = useState(false);

  const profile = userDetails;
  const displayName =
    profile?.name ||
    (profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : name.trim() || "Candidate");
  const role = profile?.profession || "Full Stack Developer";
  const initial = displayName.charAt(0).toUpperCase() || "S";

  const passedChecks = (micReady ? 1 : 0) + (cameraReady ? 1 : 0) + (online ? 1 : 0);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
      if (conn?.effectiveType) setNetworkSpeed(conn.effectiveType.toUpperCase());
    }
  }, []);

  const handleTestMic = useCallback(async () => {
    setTestingMic(true);
    try {
      if (onTestMic) await onTestMic();
      else {
        const s = await navigator.mediaDevices?.getUserMedia({ audio: true });
        s?.getTracks().forEach((t) => t.stop());
      }
    } catch {
      /* ignore */
    } finally {
      setTestingMic(false);
    }
  }, [onTestMic]);

  const handleTestCamera = useCallback(async () => {
    setTestingCamera(true);
    try {
      if (onTestCamera) await onTestCamera();
      else {
        const s = await navigator.mediaDevices?.getUserMedia({ video: true });
        s?.getTracks().forEach((t) => t.stop());
      }
    } catch {
      /* ignore */
    } finally {
      setTestingCamera(false);
    }
  }, [onTestCamera]);

  const handleRunAll = useCallback(async () => {
    setTestingAll(true);
    try {
      if (onRunAllChecks) await onRunAllChecks();
      else {
        await handleTestMic();
        await handleTestCamera();
      }
    } catch {
      /* ignore */
    } finally {
      setTestingAll(false);
    }
  }, [onRunAllChecks, handleTestMic, handleTestCamera]);

  /* ───────────────────────────────────────────────────────── */
  /*  FULL EXPANDED SIDEBAR PANEL CONTENT                      */
  /* ───────────────────────────────────────────────────────── */
  const renderExpandedContent = (isMobile = false) => (
    <div className="flex h-full flex-col bg-[#111728] text-slate-200 overflow-hidden select-none">
      {/* ── 1. BRAND HEADER ── */}
      <div className="flex items-center justify-between gap-2.5 px-4 py-3.5 border-b border-white/[0.08] bg-[#0c101d] shrink-0">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!navigationDisabled) window.location.href = "/";
          }}
          onKeyDown={(e) => {
            if (!navigationDisabled && (e.key === "Enter" || e.key === " ")) {
              window.location.href = "/";
            }
          }}
          className={`flex items-center gap-2.5 transition-transform duration-200 ${
            navigationDisabled ? "cursor-default" : "cursor-pointer group hover:scale-[1.01]"
          }`}
          title={navigationDisabled ? "Suki Software Solutions" : "Return to Home"}
        >
          {/* Logo container */}
          <div className="bg-white rounded-xl px-3 py-1.5 shadow-md shadow-black/30 border border-white/50 flex items-center justify-center transition-all group-hover:shadow-blue-500/25">
            <Image
              src="/suki-logo-cropped.png"
              alt="Suki Software Solutions"
              width={140}
              height={44}
              priority
              className="h-7 w-auto object-contain"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Desktop collapse button */}
          {!isMobile && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              className="flex size-8 items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition-all cursor-pointer border border-white/[0.06]"
            >
              <PanelLeftClose size={15} />
            </button>
          )}

          {/* Mobile close button */}
          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close menu"
              className="flex size-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">

        {/* ── PIPELINE STEPPER ── */}
        <div>
          <SectionTitle>Assessment Pipeline</SectionTitle>

          <div className="mt-1 space-y-1 relative">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx < current;
              const isActive = idx === current;
              const isLocked = idx > current;

              return (
                <div key={step.id} className="relative">
                  <div
                    className={`relative w-full rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-transparent border border-blue-500/35 shadow-[0_4px_20px_rgba(37,99,235,0.15)]"
                        : isDone
                        ? "bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05]"
                        : "opacity-60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 p-2.5">
                      {/* Step node icon */}
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold transition-all ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/40 ring-2 ring-blue-400/30"
                            : isDone
                            ? "bg-blue-950/80 text-blue-400 border border-blue-800/60"
                            : "bg-white/[0.05] text-slate-500 border border-white/[0.06]"
                        }`}
                      >
                        {isDone ? (
                          <Check size={14} strokeWidth={2.5} />
                        ) : isLocked ? (
                          <Lock size={12} />
                        ) : (
                          <Icon size={14} />
                        )}
                      </div>

                      {/* Labels */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-[13px] font-bold leading-tight truncate ${
                              isActive ? "text-white" : isDone ? "text-slate-200" : "text-slate-400"
                            }`}
                          >
                            {step.fullLabel}
                          </p>

                          {/* Status badge */}
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500 text-white shadow-sm shrink-0">
                              <span className="size-1 rounded-full bg-white animate-ping" />
                              LIVE
                            </span>
                          )}
                          {isDone && (
                            <span className="text-[10px] font-semibold text-blue-400 shrink-0">
                              Done
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 font-medium leading-none mt-1 truncate">
                          {idx === 1 && isActive
                            ? `Question ${questionIndex + 1} of ${totalQuestions}`
                            : step.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Active Question progress bar for Stage 1 */}
                    {idx === 1 && isActive && totalQuestions > 0 && (
                      <div className="px-3 pb-2.5 pt-0.5">
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-500"
                            style={{
                              width: `${Math.max(
                                8,
                                ((questionIndex + 1) / Math.max(1, totalQuestions)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── HARDWARE & DIAGNOSTICS (Stage 0 only) ── */}
        {current === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c101d] p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wide">
                  System Diagnostics
                </span>
              </div>
              <button
                type="button"
                onClick={handleRunAll}
                disabled={testingAll}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition cursor-pointer disabled:opacity-50"
              >
                {testingAll && <RefreshCw size={10} className="animate-spin" />}
                Run all
              </button>
            </div>

            {/* Checks passed bar */}
            <div className="mb-3">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
                <span>Verification status</span>
                <span className="text-blue-400 font-mono">{passedChecks} / 3 checks ready</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-500"
                  style={{ width: `${(passedChecks / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* Micro diagnostic cards */}
            <div className="space-y-1.5">
              {/* Microphone */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex size-6 items-center justify-center rounded-lg ${
                      micReady ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.06] text-slate-400"
                    }`}
                  >
                    <Mic size={13} />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">Microphone</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                      micReady ? "text-blue-400" : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        micReady ? "bg-blue-400" : "bg-slate-500"
                      }`}
                    />
                    {micReady ? "Ready" : "Waiting"}
                  </span>
                  <button
                    type="button"
                    onClick={handleTestMic}
                    disabled={testingMic}
                    className="rounded-lg bg-blue-600/70 hover:bg-blue-600 text-white px-2 py-0.5 text-[10px] font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {testingMic ? <RefreshCw size={9} className="animate-spin" /> : "Test"}
                  </button>
                </div>
              </div>

              {/* Camera */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex size-6 items-center justify-center rounded-lg ${
                      cameraReady ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.06] text-slate-400"
                    }`}
                  >
                    <Video size={13} />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">Webcam</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                      cameraReady ? "text-blue-400" : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        cameraReady ? "bg-blue-400" : "bg-slate-500"
                      }`}
                    />
                    {cameraReady ? "Active" : "Waiting"}
                  </span>
                  <button
                    type="button"
                    onClick={handleTestCamera}
                    disabled={testingCamera}
                    className="rounded-lg bg-blue-600/70 hover:bg-blue-600 text-white px-2 py-0.5 text-[10px] font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {testingCamera ? <RefreshCw size={9} className="animate-spin" /> : "Test"}
                  </button>
                </div>
              </div>

              {/* Network */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/20 text-sky-400">
                    <Wifi size={13} />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">Network</span>
                </div>
                <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                  <Signal size={11} />
                  Good ({networkSpeed})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── SESSION TELEMETRY ── */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c101d] p-3">
          <SectionTitle>Session Telemetry</SectionTitle>

          <div className="grid grid-cols-2 gap-2 mt-1 mb-2.5">
            {/* Elapsed */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mb-1">
                <Activity size={12} className="text-sky-400" />
                <span>Elapsed</span>
              </div>
              <p className="font-mono text-sm font-extrabold text-white tracking-wider">
                {fmtTime(elapsed)}
              </p>
            </div>

            {/* Time Remaining */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mb-1">
                <Clock size={12} className="text-blue-400" />
                <span>Remaining</span>
              </div>
              <p
                className={`font-mono text-sm font-extrabold tracking-wider ${
                  timeLeft !== undefined && timeLeft < 5 * 60 ? "text-rose-400" : "text-white"
                }`}
              >
                {fmtMinLeft(timeLeft)}
              </p>
            </div>
          </div>

          {/* Overall progress */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
              <span>Overall Progress</span>
              <span className="text-blue-400">
                {Math.round((Math.min(current, STEPS.length) / STEPS.length) * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-700"
                style={{
                  width: `${Math.max(
                    3,
                    (Math.min(current, STEPS.length) / STEPS.length) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── SECURITY / PROCTOR TRUST PILL ── */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-950/40 border border-blue-900/40">
          <ShieldCheck size={16} className="text-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-200 leading-tight">
              AI Monitored Session
            </p>
            <p className="text-[10px] text-slate-400 leading-tight">
              Anti-cheat & proctoring active
            </p>
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="space-y-1">
          <button
            type="button"
            disabled={navigationDisabled}
            onClick={() => {
              if (!navigationDisabled) {
                if (isMobile) onCloseMobile?.();
                window.location.href = "/";
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-xs font-semibold ${
              navigationDisabled
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
            }`}
          >
            <Home size={15} />
            <span>Back to Home</span>
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                if (isMobile) onCloseMobile?.();
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. CTA BUTTON (Stage 0) ── */}
      {current === 0 && (
        <div className="px-3.5 pt-2 pb-2.5 border-t border-white/[0.08] bg-[#0c101d] shrink-0">
          <button
            type="button"
            onClick={onStartInterview}
            disabled={isStarting}
            className="group w-full flex items-center justify-between rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-4 py-2.5 text-white font-bold text-sm shadow-xl shadow-blue-900/50 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <Zap size={14} className="fill-white/30 text-white" />
              <span>{isStarting ? "Initializing…" : "Start interview"}</span>
            </div>
            <div className="flex size-6 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition">
              {isStarting ? (
                <SukiLoadingMark size={11} />
              ) : (
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              )}
            </div>
          </button>
          <p className="mt-1.5 text-center text-[10px] text-slate-400 font-medium">
            {passedChecks < 2
              ? "Verify camera & mic to continue"
              : "System ready • Launch when prepared"}
          </p>
        </div>
      )}

      {/* ── 4. CANDIDATE PROFILE FOOTER ── */}
      <div
        onClick={() => {
          if (isMobile) onCloseMobile?.();
          onOpenProfile?.();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (isMobile) onCloseMobile?.();
            onOpenProfile?.();
          }
        }}
        className="group flex items-center gap-3 px-3.5 py-3 border-t border-white/[0.08] bg-[#090d18] hover:bg-[#141b2d] transition-colors cursor-pointer shrink-0"
        title="Candidate Profile & Settings"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-black text-white ring-2 ring-blue-500/30 shadow-md">
            {initial}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-blue-500 border-2 border-[#090d18]" />
        </div>

        {/* Name / Role */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate group-hover:text-sky-300 transition-colors">
            {displayName}
          </p>
          <p className="text-[10px] text-slate-400 font-medium truncate">{role}</p>
        </div>

        {/* Settings button */}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] group-hover:border-sky-500/40 group-hover:bg-sky-500/10 transition-all">
          <Settings size={13} className="text-slate-400 group-hover:text-sky-300 transition-colors" />
        </div>
      </div>
    </div>
  );

  /* ───────────────────────────────────────────────────────── */
  /*  COLLAPSED ICON RAIL (Desktop only when toggled)          */
  /* ───────────────────────────────────────────────────────── */
  const renderCollapsedRail = () => (
    <div className="flex h-full w-[68px] flex-col items-center justify-between bg-[#0e1322] border-r border-white/[0.08] py-3.5 my-3 rounded-2xl shadow-xl">
      {/* Top section: Brand mark & Expand toggle */}
      <div className="flex flex-col items-center gap-3">
        {/* Suki Brand Mark */}
        <button
          type="button"
          title={navigationDisabled ? "Suki Software Solutions" : "Return to Home"}
          onClick={() => {
            if (!navigationDisabled) window.location.href = "/";
          }}
          className={`flex size-10 items-center justify-center rounded-xl bg-white shadow-md shadow-black/25 p-1.5 border border-white/60 transition-transform ${
            navigationDisabled ? "cursor-default" : "cursor-pointer hover:scale-105"
          }`}
        >
          <Image
            src="/suki-mark-hq.png"
            alt="Suki"
            width={28}
            height={28}
            className="h-7 w-auto object-contain"
          />
        </button>

        {/* Expand Sidebar Button */}
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          className="flex size-8 items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition-all cursor-pointer border border-white/[0.06]"
        >
          <PanelLeftOpen size={16} />
        </button>

        <div className="w-8 h-px bg-white/[0.08]" />

        {/* Stage icons */}
        <div className="flex flex-col items-center gap-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < current;
            const isActive = idx === current;

            return (
              <button
                key={step.id}
                type="button"
                title={`${step.fullLabel} (${isDone ? "Done" : isActive ? "Active" : "Locked"})`}
                className={`flex size-10 items-center justify-center rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/60 ring-2 ring-blue-400/30"
                    : isDone
                    ? "bg-blue-950/80 text-blue-400 border border-blue-800/60 hover:bg-blue-900/50"
                    : "text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]"
                }`}
              >
                {isDone ? (
                  <Check size={16} strokeWidth={2.5} />
                ) : (
                  <Icon size={16} />
                )}
                {isActive && (
                  <span className="absolute -top-1 -right-1 flex size-2.5">
                    <span className="absolute inset-0 rounded-full bg-sky-400 animate-ping opacity-75" />
                    <span className="relative rounded-full bg-white size-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom section: Telemetry dot, Home & Candidate avatar */}
      <div className="flex flex-col items-center gap-3">
        {/* Quick Home */}
        <button
          type="button"
          title="Back to Home"
          disabled={navigationDisabled}
          onClick={() => {
            if (!navigationDisabled) window.location.href = "/";
          }}
          className={`flex size-9 items-center justify-center rounded-xl transition-all ${
            navigationDisabled
              ? "text-slate-700 cursor-not-allowed"
              : "text-slate-400 hover:text-white hover:bg-white/[0.07] cursor-pointer"
          }`}
        >
          <Home size={16} />
        </button>

        <div className="w-8 h-px bg-white/[0.08]" />

        {/* Candidate Avatar */}
        <button
          type="button"
          title={displayName}
          onClick={onOpenProfile}
          className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-black text-white ring-2 ring-blue-500/30 hover:ring-blue-400/60 transition shadow-md cursor-pointer"
        >
          {initial}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className={`hidden lg:flex min-h-0 shrink-0 my-3 ml-3 transition-all duration-300 ease-in-out ${
          collapsed ? "w-[68px]" : "w-[285px] xl:w-[305px]"
        }`}
      >
        <div className="w-full h-full rounded-[20px] overflow-hidden border border-[#1e2742] shadow-[0_20px_50px_rgba(2,6,20,0.55)]">
          {collapsed ? renderCollapsedRail() : renderExpandedContent(false)}
        </div>
      </aside>

      {/* ── MOBILE BACKDROP ── */}
      <div
        className={`fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* ── MOBILE DRAWER ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-[120] flex w-[310px] max-w-[88vw] flex-col bg-[#111728] shadow-2xl transition-transform duration-300 ease-out lg:hidden overflow-y-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-label="Candidate assessment navigation"
      >
        {renderExpandedContent(true)}
      </aside>
    </>
  );
}
