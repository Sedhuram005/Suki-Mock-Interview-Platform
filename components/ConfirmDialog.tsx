"use client";

import { Loader2 } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/lib/ui";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{children}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} disabled={busy} className={btnSecondary}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy} className={btnPrimary}>
            {busy ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
