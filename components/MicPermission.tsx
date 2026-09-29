"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  LoaderCircle,
  Mic,
  XCircle,
} from "lucide-react";
import { btnPrimary } from "@/lib/ui";

type Status = "idle" | "pending" | "granted" | "denied";

const STATUS_META = {
  idle: { label: "Not requested", classes: "bg-slate-100 text-slate-700", Icon: CircleDashed },
  pending: { label: "Waiting for permission", classes: "bg-amber-50 text-amber-800", Icon: LoaderCircle },
  granted: { label: "Granted", classes: "bg-emerald-50 text-emerald-800", Icon: CheckCircle2 },
  denied: { label: "Denied", classes: "bg-red-50 text-red-800", Icon: XCircle },
} satisfies Record<Status, { label: string; classes: string; Icon: typeof CircleDashed }>;

type MicPermissionProps = {
  onGranted: (stream: MediaStream) => void;
  onContinue: () => void;
};

export default function MicPermission({ onGranted, onContinue }: MicPermissionProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let permission: PermissionStatus | undefined;
    const syncStatus = () => {
      if (!permission) return;
      setStatus((current) => {
        if (current === "granted") return current;
        if (permission?.state === "denied") return "denied";
        return current === "denied" ? "idle" : current;
      });
    };

    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((result) => {
        permission = result;
        syncStatus();
        result.onchange = syncStatus;
      })
      .catch(() => {});

    return () => {
      if (permission) permission.onchange = null;
    };
  }, []);

  const requestMic = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("denied");
      setError("This browser cannot access a microphone. Try a current browser over HTTPS or localhost.");
      return;
    }

    setStatus("pending");
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus("granted");
      onGranted(stream);
    } catch (caught) {
      setStatus("denied");
      const errorName = caught instanceof DOMException ? caught.name : "";
      setError(
        errorName === "NotFoundError"
          ? "No microphone was found. Connect one and try again."
          : errorName === "NotReadableError"
            ? "The microphone is busy in another app. Close it there, then try again."
            : "Microphone access was blocked. Update this site's microphone permission, then try again.",
      );
    }
  };

  const { label, classes, Icon } = STATUS_META[status];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-xl bg-blue-50 text-blue-800">
          <Mic size={27} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-2xl font-semibold text-slate-900">Check your microphone</h2>
        <p className="mt-2 text-sm text-slate-600">
          Allow microphone access to record your answers.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-sm font-medium text-slate-700">Permission status</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${classes}`}>
          <Icon size={14} className={status === "pending" ? "animate-spin" : ""} aria-hidden="true" />
          {label}
        </span>
      </div>

      {status === "denied" && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error && <p className="font-medium">{error}</p>}
          <p className={error ? "mt-2" : ""}>To allow microphone access:</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Open this site&apos;s settings from the browser address bar.</li>
            <li>Set Microphone permission to Allow.</li>
            <li>Return here and choose Try again.</li>
          </ol>
        </div>
      )}

      {status === "granted" ? (
        <button type="button" onClick={onContinue} className={`${btnPrimary} w-full`}>
          Continue to interview <ArrowRight size={16} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={requestMic}
          disabled={status === "pending"}
          className={`${btnPrimary} w-full`}
        >
          {status === "pending" ? (
            <><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Waiting for permission...</>
          ) : status === "denied" ? (
            "Try again"
          ) : (
            "Enable microphone"
          )}
        </button>
      )}
    </div>
  );
}