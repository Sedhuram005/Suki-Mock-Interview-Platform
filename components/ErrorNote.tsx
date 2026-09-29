import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export default function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}