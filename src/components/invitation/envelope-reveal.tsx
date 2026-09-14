"use client";

import { useAnimate, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  /** Stable key for the "already seen" flag (guest token or event slug). */
  seenKey: string;
  /** Preloaded before the envelope opens so the reveal is never a blank frame. */
  revealImageUrl: string | null;
  /** The server-rendered invitation. Always present in the HTML. */
  children: ReactNode;
};

type Stage = "closed" | "opening" | "open";

const PRELOAD_TIMEOUT_MS = 2500;
const storageKey = (key: string) => `da3wety:seen:${key}`;

function preload(url: string | null): Promise<void> {
  if (!url) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    img.src = url;
    setTimeout(done, PRELOAD_TIMEOUT_MS);
  });
}

function readSeen(key: string): boolean {
  try {
    return localStorage.getItem(storageKey(key)) === "1";
  } catch {
    return false;
  }
}

function writeSeen(key: string, value: boolean) {
  try {
    if (value) localStorage.setItem(storageKey(key), "1");
    else localStorage.removeItem(storageKey(key));
  } catch {
    /* private mode */
  }
}

/**
 * Two-step reveal: the envelope flap opens, then the card rises and the envelope
 * falls away. One imperative sequence (useAnimate) so ordering is guaranteed and a
 * single `complete()` serves tap-to-skip, reduced motion, and "seen before".
 * The invitation is rendered underneath the envelope from the first byte, so a
 * failed script still leaves a readable page (see the noscript rule).
 */
export function EnvelopeReveal({ seenKey, revealImageUrl, children }: Props) {
  const t = useTranslations("Invitation");
  const [scope, animate] = useAnimate();
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>("closed");
  const controls = useRef<ReturnType<typeof animate> | null>(null);
  const started = useRef(false);

  const run = useCallback(
    (instant: boolean) => {
      if (started.current) return;
      started.current = true;
      setStage("opening");

      const sequence = animate([
        [".inv-seal", { scale: 0, opacity: 0 }, { duration: 0.25, ease: "easeIn" }],
        [".inv-flap", { rotateX: -180 }, { duration: 0.9, ease: [0.65, 0, 0.35, 1] }],
        [".inv-flap", { zIndex: 0 }, { at: 0.55, duration: 0 }],
        [".inv-card", { y: 0, scale: 1, opacity: 1 }, { at: "-0.25", duration: 0.75, ease: "easeOut" }],
        [".inv-envelope-layer", { opacity: 0, y: 120 }, { at: "<", duration: 0.55, ease: "easeIn" }],
      ]);
      controls.current = sequence;
      if (instant) sequence.complete();
      sequence.then(() => {
        setStage("open");
        writeSeen(seenKey, true);
      });
    },
    [animate, seenKey],
  );

  useEffect(() => {
    let cancelled = false;
    const seen = readSeen(seenKey);
    if (seen || reduceMotion) {
      run(true);
      return;
    }
    preload(revealImageUrl).then(() => {
      if (!cancelled) run(false);
    });
    return () => {
      cancelled = true;
      controls.current?.stop();
    };
  }, [seenKey, revealImageUrl, reduceMotion, run]);

  function skip() {
    if (!started.current) run(true);
    else controls.current?.complete();
  }

  function replay() {
    writeSeen(seenKey, false);
    window.location.reload();
  }

  return (
    <div ref={scope} className="relative flex min-h-dvh flex-1 flex-col">
      <noscript>
        <style>{`.inv-envelope-layer{display:none}.inv-card{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      <m.div
        className="inv-card flex flex-1 flex-col"
        initial={{ opacity: 0, y: 48, scale: 0.96 }}
        style={{ willChange: "transform, opacity" }}
      >
        {children}
        {stage === "open" ? (
          <div className="pb-6 text-center">
            <button
              type="button"
              onClick={replay}
              className="text-sm text-(--inv-muted) underline-offset-4 hover:underline"
            >
              {t("replay")}
            </button>
          </div>
        ) : null}
      </m.div>

      {stage !== "open" ? (
        <m.button
          type="button"
          onClick={skip}
          aria-label={stage === "closed" ? t("openEnvelope") : t("skip")}
          className="inv-envelope-layer fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-8 bg-(--inv-paper) focus-visible:outline-none"
          style={{ perspective: 1200 }}
        >
          <div className="relative aspect-[4/3] w-72 sm:w-80" style={{ transformStyle: "preserve-3d" }}>
            {/* Back of the envelope with the gold liner peeking out under the flap. */}
            <div className="absolute inset-0 rounded-md bg-(--inv-accent) shadow-[0_24px_48px_-20px_rgba(42,26,29,0.55)]" />
            <div
              className="absolute inset-x-[6%] top-[6%] h-[48%] bg-(--inv-gold-soft)"
              style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
            />
            {/* Pocket: two side folds and the bottom fold, drawn on top of the liner. */}
            <div
              className="absolute inset-0 rounded-md bg-(--inv-accent) brightness-95"
              style={{ clipPath: "polygon(0 0, 50% 55%, 0 100%)" }}
            />
            <div
              className="absolute inset-0 rounded-md bg-(--inv-accent) brightness-95"
              style={{ clipPath: "polygon(100% 0, 50% 55%, 100% 100%)" }}
            />
            <div
              className="absolute inset-0 rounded-md bg-(--inv-accent) brightness-110"
              style={{ clipPath: "polygon(0 100%, 50% 50%, 100% 100%)" }}
            />
            {/* Flap: hinged at the top, flips back over the envelope. */}
            <m.div
              className="inv-flap absolute inset-x-0 top-0 h-[58%] rounded-t-md bg-(--inv-accent)"
              style={{
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                transformOrigin: "top",
                backfaceVisibility: "hidden",
                zIndex: 2,
                willChange: "transform",
              }}
            />
            {/* Wax seal. */}
            <m.div
              className="inv-seal absolute start-1/2 top-[50%] z-3 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-(--inv-gold) shadow-md rtl:translate-x-1/2"
              aria-hidden="true"
            >
              <span className="block size-3 rotate-45 border-2 border-(--inv-paper)" />
            </m.div>
          </div>
          <span className="font-heading text-2xl text-(--inv-ink)">
            {stage === "closed" ? t("openEnvelope") : t("skip")}
          </span>
        </m.button>
      ) : null}
    </div>
  );
}
