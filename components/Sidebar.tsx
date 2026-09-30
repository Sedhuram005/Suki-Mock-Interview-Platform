"use client";

import {
  Check,
  ClipboardList,
  Flag,
  Mic,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Home,
  Cpu,
  Radio,
  BadgeCheck,
  Phone,
  GraduationCap,
  Database,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export const STEPS = [
  { fullLabel: "Audio & Microphone Check", icon: Mic },
  { fullLabel: "Spoken Assessment", icon: ClipboardList },
  { fullLabel: "Results & Submission", icon: Flag },
];

type Props = {
  current: number;
  name: string;
  refId: string | null;
  micReady: boolean;
  deviceLabel?: string | null;
  userDetails?: any;
  questionIndex?: number;
  totalQuestions?: number;
  elapsed?: number;
  interviewId?: string | null;
  onOpenProfile?: () => void;
  onLogout?: () => void;
};

export default function Sidebar({
  current,
  name,
  refId,
  micReady,
  userDetails,
  questionIndex = 0,
  totalQuestions = 4,
  elapsed = 0,
  interviewId,
  onOpenProfile,
  onLogout,
}: Props) {
  const [profile, setProfile] = useState<any>(userDetails || null);
  const [tick, setTick] = useState(elapsed);

  useEffect(() => {
    if (userDetails) { setProfile(userDetails); return; }
    const raw = localStorage.getItem("userData");
    if (raw) { try { setProfile(JSON.parse(raw)); } catch {} }
  }, [userDetails]);

  useEffect(() => { setTick(elapsed); }, [elapsed]);
  useEffect(() => {
    const id = setInterval(() => setTick((p) => p + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const displayName =
    profile?.name ||
    (profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : name.trim() || "Candidate");

  const role = profile?.profession || "Candidate";
  const emailVal = profile?.email || "";
  const phoneVal = profile?.phone || "";
  const eduVal = profile?.education || "";
  const initial = displayName.charAt(0).toUpperCase() || "C";

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <aside
      className="hidden lg:flex shrink-0 flex-col m-3 overflow-y-auto overflow-x-hidden"
      style={{
        width: "320px",
        borderRadius: "40px",
        background: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)",
        border: "1.5px solid #1E40AF",
        boxShadow: "0 4px 32px rgba(37,99,235,0.25), 0 1px 4px rgba(0,0,0,0.1)",
      }}
    >
      {/* ─── HEADER ─── */}
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-black text-white tracking-tight">
            Candidate Portal
          </h2>
          <span
            className="flex items-center gap-1 text-[10px] font-bold text-white"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              borderRadius: "20px",
              padding: "4px 10px",
            }}
          >
            <BadgeCheck size={12} />
            Verified
          </span>
        </div>
      </div>

      {/* ─── PROFILE CARD ─── */}
      <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-full flex items-center gap-4 cursor-pointer text-left transition-colors duration-200 hover:bg-white/10"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1.5px solid rgba(255,255,255,0.2)",
            borderRadius: "20px",
            padding: "16px",
          }}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="flex items-center justify-center font-black text-[20px] text-white"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.2)",
                boxShadow: "0 4px 16px rgba(255,255,255,0.15)",
              }}
            >
              {initial}
            </div>
            <span
              className="absolute -bottom-1 -right-1 flex items-center justify-center bg-white rounded-full"
              style={{ width: "18px", height: "18px", border: "2px solid #1E40AF" }}
            >
              <Check size={10} color="#1E40AF" strokeWidth={3} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-white truncate">{displayName}</p>
            <p className="text-[12px] font-semibold text-blue-100 truncate mt-0.5">{role}</p>
            <p className="text-[11px] text-blue-200 truncate mt-0.5">{emailVal}</p>
          </div>

          <ChevronRight size={16} className="shrink-0 text-blue-200" />
        </button>
      </div>

      {/* ─── INFO ROWS ─── */}
      <div className="px-6 py-3 space-y-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        {/* Session Timer */}
        <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <span className="flex items-center gap-2 text-[12px] text-blue-100 font-medium">
            <Radio size={14} className="text-emerald-400" />
            Session Time:
          </span>
          <span className="text-[13px] font-bold text-white font-mono">{fmtTime(tick)}</span>
        </div>

        {/* Mic Status */}
        <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <span className="flex items-center gap-2 text-[12px] text-blue-100 font-medium">
            <Mic size={14} className={micReady ? "text-emerald-400" : "text-blue-300"} />
            Microphone:
          </span>
          <span className={`text-[13px] font-bold ${micReady ? "text-emerald-400" : "text-blue-300"}`}>
            {micReady ? "Calibrated" : "Standby"}
          </span>
        </div>

        {/* AI Engine */}
        <div className="flex items-center justify-between py-3">
          <span className="flex items-center gap-2 text-[12px] text-blue-100 font-medium">
            <Cpu size={14} className="text-blue-300" />
            AI Engine:
          </span>
          <span className="text-[13px] font-bold text-white">Whisper · STAR</span>
        </div>
      </div>

      {/* ─── INTERVIEW STAGES ─── */}
      <div className="px-4 py-4 flex-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-200 px-2 mb-3">
          Interview Stages
        </p>
        <div className="space-y-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const complete = index < current;
            const active = index === current;

            return (
              <div
                key={step.fullLabel}
                className="relative flex items-center gap-3 transition-all duration-200"
                style={{
                  borderRadius: "16px",
                  padding: "12px 14px",
                  background: active ? "rgba(255,255,255,0.25)" : complete ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)",
                  border: active
                    ? "1.5px solid rgba(255,255,255,0.4)"
                    : complete
                    ? "1.5px solid rgba(16,185,129,0.4)"
                    : "1.5px solid rgba(255,255,255,0.15)",
                  boxShadow: active ? "0 4px 16px rgba(255,255,255,0.15)" : "none",
                }}
              >
                {/* Icon */}
                <span
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: complete ? "#10B981" : active ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)",
                    boxShadow: complete ? "0 2px 8px rgba(16,185,129,0.3)" : "none",
                  }}
                >
                  {complete
                    ? <Check size={17} color="white" strokeWidth={2.5} />
                    : <Icon size={17} color={active ? "white" : "#BFDBFE"} />
                  }
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-bold leading-tight ${active ? "text-white" : complete ? "text-emerald-300" : "text-blue-100"}`}>
                    {step.fullLabel}
                  </p>
                  <p className={`text-[10px] mt-0.5 font-semibold ${active ? "text-blue-100" : complete ? "text-emerald-400" : "text-blue-300"}`}>
                    {complete ? "✓ Completed" : active ? "In Progress" : "Pending"}
                  </p>
                  {active && index === 1 && (
                    <div className="mt-2 h-1 w-full rounded-full bg-white/30">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-500"
                        style={{ width: `${(questionIndex / totalQuestions) * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                {active && (
                  <span
                    className="shrink-0 flex items-center justify-center text-[10px] font-extrabold text-blue-600 bg-white"
                    style={{ width: 22, height: 22, borderRadius: 7 }}
                  >
                    {index + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── BOTTOM ACTIONS ─── */}
      <div className="px-4 py-4 space-y-2 shrink-0">
        {/* Home button */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 text-white font-bold text-[13px] transition-colors duration-200"
          style={{
            borderRadius: "16px",
            padding: "12px 16px",
            border: "1.5px solid rgba(255,255,255,0.2)",
          }}
        >
          <Home size={16} className="text-blue-200" />
          Back to Home
        </Link>

        {/* Sign out */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center justify-center gap-2 w-full text-blue-200 hover:text-white hover:bg-white/10 font-semibold text-[12px] cursor-pointer transition-all duration-200"
            style={{
              borderRadius: "14px",
              padding: "10px 16px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <LogOut size={14} />
            Switch candidate or sign out
          </button>
        )}
      </div>
    </aside>
  );
}
