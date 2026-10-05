import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export default function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
