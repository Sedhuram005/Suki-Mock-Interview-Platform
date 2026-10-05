"use client";

import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Video,
  XCircle,
} from "lucide-react";
import { btnPrimary } from "@/lib/ui";
import SukiLoadingMark from "@/components/SukiLoadingMark";

type Status = "idle" | "pending" | "granted" | "denied";

const STATUS_META = {
  idle: { label: "Not requested", classes: "bg-slate-100 text-slate-700", Icon: CircleDashed },
  pending: { label: "Waiting for permission", classes: "bg-amber-50 text-amber-800", Icon: CircleDashed },
  granted: { label: "Granted", classes: "bg-emerald-50 text-emerald-800", Icon: CheckCircle2 },
  denied: { label: "Denied", classes: "bg-red-50 text-red-800", Icon: XCircle },
} satisfies Record<Status, { label: string; classes: string; Icon: typeof CircleDashed }>;

type Props = { onGranted: (stream: MediaStream) => void; onContinue: () => void; continuing?: boolean };

export default function MicPermission({ onGranted, onContinue, continuing }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

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
      setError("This browser cannot access media devices. Try a current browser over HTTPS or localhost.");
      return;
    }

    setStatus("pending");
    setError("");

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setStatus("granted");
      setStream((current) => {
        current?.getTracks().forEach((track) => track.stop());
        return nextStream;
      });
      onGranted(nextStream);
    } catch (caught) {
      const previousStream = stream;
      previousStream?.getTracks().forEach((track) => track.stop());
      setStatus("denied");
      const errorName = caught instanceof DOMException ? caught.name : "";
      setError(
        errorName === "NotFoundError"
          ? "No microphone or camera was found. Connect them and try again."
          : errorName === "NotReadableError"
            ? "The microphone or camera is busy in another app. Close it there, then try again."
            : "The microphone or camera is not active. Reload the page and allow access again.",
      );
    }
  };

  const { label, classes, Icon } = STATUS_META[status];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
          <Video size={28} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-2xl font-semibold text-slate-900">Check your microphone & camera</h2>
        <p className="mt-2 text-sm text-slate-600">
          Allow microphone and camera access to record your video interview.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm font-medium text-slate-700">Audio &amp; camera status</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${classes}`}>
          {status === "pending" ? <SukiLoadingMark size={14} /> : <Icon size={14} aria-hidden="true" />}
          {label}
        </span>
      </div>

      {status === "denied" && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error && <p className="font-medium">{error}</p>}
          <p className={error ? "mt-2" : ""}>To allow microphone and camera access:</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Open this site&apos;s settings from the browser address bar (look for the lock icon).</li>
            <li>Set Microphone and Camera permissions to Allow.</li>
            <li>Return here and choose Try again.</li>
            <li>If that doesn&apos;t work, refresh the page and allow microphone and camera access when prompted.</li>
          </ol>
        </div>
      )}

      {status === "granted" && stream && (
        <div className="space-y-3">
          <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/50 text-white px-2 py-1 rounded">
              <Video size={16} />
              <span className="text-xs">Camera Preview</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Microphone: {stream?.getAudioTracks()[0]?.label || "Default microphone"}<br />
            Camera: {stream?.getVideoTracks()[0]?.label || "Default camera"}
          </p>
        </div>
      )}

      {status === "granted" ? (
        <button onClick={onContinue} disabled={continuing} className={`${btnPrimary} w-full`}>
          {continuing ? (
            <><SukiLoadingMark size={16} /> Starting session...</>
          ) : (
            <>Continue to interview <ArrowRight size={16} /></>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={requestMic}
          disabled={status === "pending"}
          className={`${btnPrimary} w-full`}
        >
          {status === "pending" ? (
            <><SukiLoadingMark size={16} /> Waiting for permission...</>
          ) : status === "denied" ? (
            "Try again"
          ) : (
            "Enable microphone & camera"
          )}
        </button>
      )}
    </div>
  );
}
