"use client";

import { btnPrimary, btnSecondary } from "@/lib/ui";
import SukiLoadingMark from "@/components/SukiLoadingMark";

type Props = {
  open: boolean;
  title: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
};

export default function ConfirmDialog({ open, title, confirmLabel, busy, onCancel, onConfirm, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-blue-950/20">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} disabled={busy} className={btnSecondary}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy} className={btnPrimary}>
            {busy ? <><SukiLoadingMark size={16} /> Processing...</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
