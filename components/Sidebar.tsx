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
    <aside className="hidden w-72 shrink-0 flex-col bg-[#0a2540] text-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
        <span className="grid size-9 place-items-center rounded-lg bg-blue-600">
          <ShieldCheck size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight">TalentIQ</p>
          <p className="text-[10px] uppercase text-blue-200/70">Assessment Portal</p>
        </div>
      </div>

      {name.trim() && (
        <div className="mx-4 mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] font-semibold uppercase text-blue-200/70">Candidate</p>
          <p className="mt-1 truncate text-sm font-semibold">{name}</p>
          {refId && <p className="mt-1 text-xs text-blue-200/70">Ref ID: {refId}</p>}
        </div>
      )}

      <nav className="flex-1 px-4 py-6" aria-label="Assessment steps">
        <p className="px-2 text-[10px] font-semibold uppercase text-blue-200/60">
          Assessment steps
        </p>
        <ol className="mt-3 space-y-1">
          {STEPS.map((step, index) => {
            const complete = index < current;
            const active = index === current;
            return (
              <li
                key={step.label}
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-white/10 font-semibold text-white"
                    : complete
                      ? "text-blue-100"
                      : "text-blue-200/50"
                }`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    complete
                      ? "bg-emerald-600 text-white"
                      : active
                        ? "bg-blue-600 text-white"
                        : "border border-white/20"
                  }`}
                >
                  {complete ? <Check size={14} aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">{step.label}</span>
                {active && <span className="size-1.5 rounded-full bg-blue-400" />}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4 text-sm">
        <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5">
          <span className="text-blue-100">Microphone</span>
          <span className={`flex items-center gap-1.5 text-xs font-medium ${micReady ? "text-emerald-300" : "text-blue-200/60"}`}>
            <span className={`size-2 rounded-full ${micReady ? "bg-emerald-400" : "bg-blue-200/40"}`} />
            {micReady ? "Ready" : "Not checked"}
          </span>
        </div>
        {deviceLabel && (
          <p className="truncate px-1 text-xs text-blue-200/60" title={deviceLabel}>{deviceLabel}</p>
        )}
        <p className="flex items-center gap-2 px-1 text-xs text-blue-200/70">
          <LifeBuoy size={14} aria-hidden="true" /> Need help? Contact your test coordinator.
        </p>
      </div>
    </aside>
  );
}