"use client";

import { useEffect } from "react";

export default function MediaMockPolyfill() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    const originalGetUserMedia = navigator.mediaDevices.getUserMedia?.bind(navigator.mediaDevices);
    if (!originalGetUserMedia) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator.mediaDevices as any).getUserMedia = async function (constraints: MediaStreamConstraints) {
      try {
        return await originalGetUserMedia(constraints);
      } catch (caught: unknown) {
        const error = caught as Error & { name?: string };
        const errorName = error.name;
        if (errorName === "NotFoundError" || errorName === "NotAllowedError") {
          console.warn("Could not get media devices, falling back to mock stream.", caught);
          const mockStream = new MediaStream();
          
          if (constraints.audio) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const dest = audioCtx.createMediaStreamDestination();
            const osc = audioCtx.createOscillator();
            osc.connect(dest);
            osc.start();
            dest.stream.getAudioTracks().forEach(t => mockStream.addTrack(t));
          }
          
          if (constraints.video) {
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#1e293b";
              ctx.fillRect(0, 0, 640, 480);
              ctx.fillStyle = "#94a3b8";
              ctx.font = "24px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("Mock Camera", 320, 220);
              ctx.fillText("(No device found)", 320, 260);
            }
            let active = true;
            let counter = 0;
            const paint = () => {
              if (!active) return;
              if (ctx) {
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(0, 0, 640, 480);
                ctx.fillStyle = "#94a3b8";
                ctx.font = "24px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("Mock Camera", 320, 220);
                ctx.fillText("(No device found) - " + counter++, 320, 260);
              }
              setTimeout(paint, 1000);
            };
            paint();
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const videoStream = (canvas as any).captureStream(1);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            videoStream.getVideoTracks().forEach((t: any) => {
               const originalStop = t.stop.bind(t);
               t.stop = () => { active = false; originalStop(); };
               mockStream.addTrack(t);
            });
          }
          
          return mockStream;
        }
        throw caught;
      }
    };
  }, []);

  return null;
}

