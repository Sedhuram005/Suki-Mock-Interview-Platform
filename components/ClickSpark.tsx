"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type Easing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: Easing;
  extraScale?: number;
  children: ReactNode;
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

function ease(progress: number, easing: Easing) {
  switch (easing) {
    case "linear":
      return progress;
    case "ease-in":
      return progress * progress;
    case "ease-in-out":
      return progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;
    default:
      return progress * (2 - progress);
  }
}

export default function ClickSpark({
  sparkColor = "#ffffff",
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = "ease-out",
  extraScale = 1,
  children,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let animationFrame: number | null = null;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      const ratio = pixelRatio();
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (timestamp: number) => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const activeSparks: Spark[] = [];
      const safeDuration = Math.max(1, duration);

      for (const spark of sparksRef.current) {
        const progress = (timestamp - spark.startTime) / safeDuration;
        if (progress >= 1) continue;

        const eased = ease(Math.max(0, progress), easing);
        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);
        const directionX = Math.cos(spark.angle);
        const directionY = Math.sin(spark.angle);

        context.beginPath();
        context.strokeStyle = sparkColor;
        context.lineWidth = 2;
        context.moveTo(
          spark.x + distance * directionX,
          spark.y + distance * directionY,
        );
        context.lineTo(
          spark.x + (distance + lineLength) * directionX,
          spark.y + (distance + lineLength) * directionY,
        );
        context.stroke();
        activeSparks.push(spark);
      }

      sparksRef.current = activeSparks;
      if (activeSparks.length > 0) {
        animationFrame = window.requestAnimationFrame(draw);
      } else {
        animationFrame = null;
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (event.detail === 0 || prefersReducedMotion.matches || sparkCount <= 0) return;

      const startTime = performance.now();
      for (let index = 0; index < sparkCount; index += 1) {
        sparksRef.current.push({
          x: event.clientX,
          y: event.clientY,
          angle: (2 * Math.PI * index) / sparkCount,
          startTime,
        });
      }

      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("click", handleClick, true);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      sparksRef.current = [];
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, [duration, easing, extraScale, sparkColor, sparkCount, sparkRadius, sparkSize]);

  return (
    <>
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 9999 }}
      />
    </>
  );
}
