import {
  Check,
  ClipboardList,
  Flag,
  LifeBuoy,
  Mic,
  ShieldCheck,
  User,
} from "lucide-react";

export const STEPS = [
  { label: "Candidate details", hint: "Enter your name to begin", icon: User },
  { label: "System check", hint: "Verify your microphone", icon: Mic },
  { label: "Interview", hint: "Answer each question aloud", icon: ClipboardList },
  { label: "Completion", hint: "Assessment submitted", icon: Flag },
];

type Props = {
  current: number;
  name: string;
  refId: string | null;
  micReady: boolean;
  deviceLabel?: string | null;
};

export default function Sidebar({ current, name, refId, micReady, deviceLabel }: Props) {
  return (
    <aside className="hidden w-80 shrink-0 flex-col bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900 text-white lg:flex shadow-2xl">
      <div className="flex h-20 items-center gap-4 border-b border-white/10 px-6 backdrop-blur-sm">
        <div className="relative">
          <span className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/25">
            <ShieldCheck size={24} aria-hidden="true" />
          </span>
          <div className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
        </div>
        <div>
          <p className="font-display text-base font-bold leading-tight">TalentIQ</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/70">Assessment Portal</p>
        </div>
      </div>

      {name.trim() && (
        <div className="mx-4 mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm shadow-lg">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/70">Candidate</p>
          <p className="mt-2 truncate text-base font-semibold">{name}</p>
          {refId && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <p className="text-xs text-blue-200/70">Ref ID: {refId}</p>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 px-4 py-6" aria-label="Assessment steps">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-blue-200/60">
          Assessment Steps
        </p>
        <ol className="mt-4 space-y-2">
          {STEPS.map((step, index) => {
            const complete = index < current;
            const active = index === current;
            return (
              <li
                key={step.label}
                aria-current={active ? "step" : undefined}
                className={`group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                    : complete
                      ? "text-blue-100 hover:bg-white/5"
                      : "text-blue-200/50 hover:bg-white/5"
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold transition-all duration-300 ${
                    complete
                      ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25"
                      : active
                        ? "bg-white/20 text-white"
                        : "border border-white/20 text-blue-200/50"
                  }`}
                >
                  {complete ? <Check size={14} aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">{step.label}</span>
                {active && <span className="size-2 rounded-full bg-blue-300 animate-pulse" />}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="space-y-4 border-t border-white/10 p-4 text-sm backdrop-blur-sm">
        <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/10">
          <div className="flex items-center gap-3">
            <Mic size={18} className="text-blue-200/70" />
            <span className="font-medium text-blue-100">Microphone</span>
          </div>
          <span className={`flex items-center gap-2 text-xs font-bold ${
            micReady 
              ? "text-emerald-300" 
              : "text-blue-200/50"
          }`}>
            <span className={`size-2 rounded-full ${micReady ? "bg-emerald-400 animate-pulse" : "bg-blue-200/40"}`} />
            {micReady ? "Ready" : "Not checked"}
          </span>
        </div>
        {deviceLabel && (
          <div className="rounded-xl bg-white/5 px-4 py-3 border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Mic size={14} className="text-blue-200/50" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/50">Device</p>
            </div>
            <p className="truncate text-xs text-blue-200/70" title={deviceLabel}>{deviceLabel}</p>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 border border-white/10">
          <LifeBuoy size={18} className="text-blue-200/70" />
          <p className="text-xs text-blue-200/70">Need help? Contact your test coordinator.</p>
        </div>
      </div>
    </aside>
  );
}
