"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { captionClass } from "@/components/invitation/caption";
import type { InvitationTheme } from "@/components/invitation/invitation-theme";

type Props = {
  src: string;
  alt: string;
  foil: InvitationTheme["foil"];
  confetti: string[];
  /** Share of the cover that must be scratched before it dissolves. */
  threshold?: number;
  onRevealed?: () => void;
};

const RADIUS = 20;
const ALPHA_VISIBLE = 32;
const PROGRESS_EVERY_MS = 120;

/**
 * The couple photo behind a scratch-off foil. The cover is painted on a canvas
 * (base tint + thousands of speckles + glitter) and erased with
 * `destination-out` strokes; coverage is sampled on a coarse grid so the
 * readback stays cheap. Past the threshold the foil fades out and confetti
 * falls. A plain button reveals it for keyboard and assistive-tech users.
 */
export function ScratchPhoto({ src, alt, foil, confetti, threshold = 0.85, onRevealed }: Props) {
  const t = useTranslations("Invitation");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const initialCount = useRef(0);
  const lastProgressAt = useRef(0);
  const done = useRef(false);
  const [started, setStarted] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const countCovered = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return 0;
    const { width, height } = canvas;
    const step = Math.max(8, Math.floor(Math.min(width, height) / 40));
    const data = ctx.getImageData(0, 0, width, height).data;
    let covered = 0;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (data[(y * width + x) * 4 + 3] >= ALPHA_VISIBLE) covered++;
      }
    }
    return covered;
  }, []);

  // Paint the foil. Re-painted on resize so the ellipse always matches the box.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || done.current) return;

    const paint = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.height;

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = withAlpha(foil.base, 0.97);
      ctx.fillRect(0, 0, w, h);

      const area = w * h;
      // Fine grain: one-pixel speckles in three tones.
      for (let i = 0, n = Math.floor(area / 8); i < n; i++) {
        const r = Math.random();
        ctx.fillStyle =
          r < 0.5
            ? withAlpha(foil.light, 0.35 + Math.random() * 0.45)
            : r < 0.85
              ? withAlpha(foil.dark, 0.25 + Math.random() * 0.4)
              : withAlpha(foil.bright, 0.4 + Math.random() * 0.4);
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
      // Coarser flecks.
      for (let i = 0, n = Math.floor(area / 22); i < n; i++) {
        const r = Math.random();
        ctx.fillStyle =
          r < 0.5
            ? withAlpha(foil.light, 0.55 + Math.random() * 0.4)
            : r < 0.85
              ? withAlpha(foil.dark, 0.45 + Math.random() * 0.4)
              : withAlpha(foil.bright, 0.65 + Math.random() * 0.35);
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.2 + 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Glitter.
      for (let i = 0, n = Math.floor(area / 1200); i < n; i++) {
        ctx.fillStyle = withAlpha(foil.glitter, 0.8 + Math.random() * 0.2);
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, Math.random() + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      initialCount.current = countCovered();
    };

    paint();
    window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, [countCovered, foil]);

  const finish = useCallback(
    (withConfetti: boolean) => {
      if (done.current) return;
      done.current = true;
      setRevealed(true);
      setStarted(true);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transition = "opacity 700ms ease-out";
        canvas.style.opacity = "0";
        canvas.style.pointerEvents = "none";
      }
      onRevealed?.();
      if (withConfetti) void burst("big", confetti);
    },
    [confetti, onRevealed],
  );

  function localPoint(e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function scratch(x: number, y: number) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx || done.current) return;
    if (!started) {
      setStarted(true);
      if (!reduceMotion) void burst("small", confetti);
    }
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = RADIUS * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
    ctx.fill();
    last.current = { x, y };

    const now = performance.now();
    if (initialCount.current && now - lastProgressAt.current > PROGRESS_EVERY_MS) {
      lastProgressAt.current = now;
      const cleared = (initialCount.current - countCovered()) / initialCount.current;
      if (cleared >= threshold) finish(!reduceMotion);
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = null;
    const { x, y } = localPoint(e);
    scratch(x, y);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const { x, y } = localPoint(e);
    scratch(x, y);
  }
  function onPointerEnd() {
    drawing.current = false;
    last.current = null;
  }

  return (
    <div className="relative mx-auto w-full">
      <figure className="relative aspect-[5/4] w-full overflow-hidden rounded-[50%] bg-(--inv-paper) p-1 shadow-[0_0_0_1px_var(--inv-gold),0_0_0_5px_var(--inv-paper),0_0_0_6px_var(--inv-gold-soft)]">
        <div className="relative size-full overflow-hidden rounded-[50%]">
          {/* eslint-disable-next-line @next/next/no-img-element -- public bucket URL; sized by CSS */}
          <img
            src={src}
            alt={alt}
            className="size-full object-cover"
            loading="eager"
            fetchPriority="high"
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onPointerLeave={onPointerEnd}
            aria-hidden="true"
            className="absolute inset-0 size-full cursor-pointer touch-none select-none"
          />
        </div>
      </figure>

      {!started ? (
        <m.span
          className={`pointer-events-none absolute inset-0 flex items-center justify-center text-(--inv-accent) ${captionClass(locale)}`}
          animate={reduceMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {t("scratchToReveal")}
        </m.span>
      ) : null}

      {!revealed ? (
        <button
          type="button"
          onClick={() => finish(!reduceMotion)}
          className="mx-auto mt-3 block text-xs text-(--inv-muted) underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-(--inv-gold) focus-visible:outline-none"
        >
          {t("revealPhoto")}
        </button>
      ) : null}
    </div>
  );
}

async function burst(kind: "small" | "big", colors: string[]) {
  const confetti = (await import("canvas-confetti")).default;
  const base = { shapes: ["circle" as const], colors, zIndex: 60, disableForReducedMotion: true };
  if (kind === "small") {
    confetti({
      ...base,
      particleCount: 60,
      spread: 360,
      startVelocity: 14,
      scalar: 0.5,
      gravity: 0.5,
      ticks: 200,
      origin: { y: 0.5 },
    });
    return;
  }
  confetti({
    ...base,
    particleCount: 240,
    spread: 360,
    startVelocity: 24,
    scalar: 0.6,
    gravity: 0.55,
    ticks: 280,
    origin: { y: 0.5 },
  });
  const until = Date.now() + 2000;
  const sides = () => {
    confetti({
      ...base,
      particleCount: 6,
      angle: 60,
      spread: 70,
      startVelocity: 32,
      scalar: 0.5,
      gravity: 0.6,
      ticks: 260,
      origin: { x: 0, y: 0.65 },
    });
    confetti({
      ...base,
      particleCount: 6,
      angle: 120,
      spread: 70,
      startVelocity: 32,
      scalar: 0.5,
      gravity: 0.6,
      ticks: 260,
      origin: { x: 1, y: 0.65 },
    });
    if (Date.now() < until) requestAnimationFrame(sides);
  };
  sides();
}

/** "#rrggbb" + alpha → "rgba(r, g, b, a)" for canvas fills. */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha.toFixed(2)})`;
}
