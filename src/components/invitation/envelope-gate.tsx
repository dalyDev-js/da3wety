"use client";

import { useAnimate, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { captionClass } from "@/components/invitation/caption";

type Props = {
  /** Embossed on the flap, e.g. "أ & س". */
  monogram: string;
  /** The invitation. Rendered underneath the gate from the first byte. */
  children: ReactNode;
};

type Phase = "closed" | "opening" | "done";

/** Subtle laid-paper grain: SVG turbulence, tiled. Cheap and no image request. */
const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.28 0 0 0 0 0.2 0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

/* Envelope geometry in % of the envelope box. The flap tip is rounded with a
   short chamfer because clip-path polygons cannot curve. */
const FLAP = "polygon(0 0, 100% 0, 53.5% 55%, 52% 57.3%, 50% 58%, 48% 57.3%, 46.5% 55%)";
const LINER = "polygon(0 0, 100% 0, 50% 60%)";
const FOLD_LEFT = "polygon(0 0, 50% 60%, 0 100%)";
const FOLD_RIGHT = "polygon(100% 0, 50% 60%, 100% 100%)";
const FOLD_BOTTOM = "polygon(0 100%, 50% 58%, 100% 100%)";

/**
 * Full-screen sealed envelope. Nothing moves until the guest taps: then the flap
 * lifts, the card rises out of the pocket, and the scene zooms and fades to paper,
 * handing over to the invitation underneath. One imperative sequence (useAnimate)
 * so the order is guaranteed and reduced motion can `complete()` it instantly.
 */
export function EnvelopeGate({ monogram, children }: Props) {
  const t = useTranslations("Invitation");
  const locale = useLocale();
  const [scope, animate] = useAnimate();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("closed");
  const started = useRef(false);

  // The page must not scroll behind the gate.
  useEffect(() => {
    if (phase === "done") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  function open() {
    if (started.current) return;
    started.current = true;
    setPhase("opening");

    // Absolute times (seconds): seal breaks, flap lifts, card rises, camera pushes
    // in while the paper veil covers the hand-over.
    const sequence = animate([
      [".gate-hint", { opacity: 0 }, { at: 0, duration: 0.2 }],
      [".gate-monogram", { opacity: 0, scale: 0.92 }, { at: 0, duration: 0.35, ease: "easeIn" }],
      [".gate-flap-shadow", { opacity: 0 }, { at: 0.25, duration: 0.3 }],
      [".gate-flap", { rotateX: -180 }, { at: 0.25, duration: 1.15, ease: [0.65, 0, 0.35, 1] }],
      [".gate-flap", { zIndex: 0 }, { at: 0.85, duration: 0 }],
      [".gate-card", { transform: "translateY(-36%) scale(1)" }, { at: 1.0, duration: 1.0, ease: [0.22, 1, 0.36, 1] }],
      [".gate-scene", { transform: "scale(1.32) translateY(6%)" }, { at: 1.55, duration: 1.3, ease: [0.4, 0, 0.2, 1] }],
      [".gate-veil", { opacity: 1 }, { at: 2.05, duration: 1.0, ease: "easeInOut" }],
    ]);
    if (reduceMotion) sequence.complete();
    sequence.then(() => setPhase("done"));
  }

  return (
    <div ref={scope} className="relative flex min-h-dvh flex-1 flex-col">
      {children}

      {phase !== "done" ? (
        <button
          type="button"
          onClick={open}
          aria-label={t("tapToOpen")}
          className="fixed inset-0 z-50 cursor-pointer overflow-hidden bg-(--inv-paper) focus-visible:outline-none"
        >
          <div
            className="gate-scene absolute inset-0"
            style={{ transform: "scale(1) translateY(0%)", willChange: "transform" }}
          >
            {/* The envelope overflows the viewport on purpose: the guest is looking at
                the sealed flap up close, like holding it. */}
            <div className="absolute top-1/2 left-1/2 h-[118vh] w-[140vw] -translate-x-1/2 -translate-y-1/2 landscape:w-[112vh]">
              {/* Interior seen once the flap lifts. */}
              <div
                className="absolute inset-0"
                style={{ clipPath: LINER, background: "linear-gradient(180deg, #d9cfbb 0%, #e5dccb 60%)" }}
              />
              {/* The card inside the pocket. */}
              <div
                className="gate-card absolute inset-x-[23%] top-[29%] h-[66%] rounded-[3px] bg-(--inv-paper) shadow-[0_-10px_30px_-12px_rgba(42,26,29,0.45)]"
                style={{ transform: "translateY(0%) scale(0.94)", backgroundImage: PAPER_GRAIN }}
              >
                <div className="absolute inset-[6%] border border-(--inv-gold)/60" />
                <div className="absolute inset-[7.5%] border border-(--inv-gold)/40" />
              </div>
              {/* Pocket: side folds then the bottom fold, each with a soft seam. */}
              <Fold clip={FOLD_LEFT} shade="linear-gradient(90deg, #efe7d8, #e8dfcd)" />
              <Fold clip={FOLD_RIGHT} shade="linear-gradient(270deg, #efe7d8, #e8dfcd)" />
              <Fold clip={FOLD_BOTTOM} shade="linear-gradient(0deg, #f1e9da, #e9e0ce)" />
              {/* Soft seam under the flap edge; fades as the flap lifts. */}
              <div
                className="gate-flap-shadow absolute inset-0"
                style={{
                  clipPath: FLAP,
                  transform: "translateY(3px)",
                  background: "rgba(42,26,29,0.09)",
                  filter: "blur(2px)",
                }}
              />
              {/* Flap, hinged at the top edge. Perspective lives on the flap itself so
                  the pocket keeps normal 2D stacking (z-index) instead of depth sorting. */}
              <m.div
                className="gate-flap absolute inset-0"
                style={{
                  transformOrigin: "top",
                  transformStyle: "preserve-3d",
                  transformPerspective: 1400,
                  zIndex: 2,
                  willChange: "transform",
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath: FLAP,
                    background: "linear-gradient(180deg, #f4ede0 0%, #ede4d3 42%, #e4dac8 58%)",
                    backfaceVisibility: "hidden",
                  }}
                >
                  <div className="absolute inset-0 opacity-70" style={{ backgroundImage: PAPER_GRAIN }} />
                </div>
                {/* Back of the flap, visible mid-flip. */}
                <div
                  className="absolute inset-0 bg-[#e3d9c6]"
                  style={{ clipPath: FLAP, transform: "rotateX(180deg)", backfaceVisibility: "hidden" }}
                />
                <m.span
                  className="gate-monogram absolute top-[41%] left-1/2 -translate-x-1/2 font-heading text-[clamp(2.75rem,9vw,4.5rem)] leading-none whitespace-nowrap text-[#dcd2bf]"
                  style={{
                    backfaceVisibility: "hidden",
                    textShadow: "-1px -1px 1px rgba(255,255,255,0.85), 1px 1.5px 2px rgba(42,26,29,0.22)",
                  }}
                  dir="ltr"
                  aria-hidden="true"
                >
                  {monogram}
                </m.span>
              </m.div>
            </div>
          </div>

          <m.span
            className={`gate-hint absolute inset-x-0 bottom-[max(env(safe-area-inset-bottom),2rem)] mx-auto w-fit text-(--inv-accent) ${captionClass(locale)}`}
            animate={reduceMotion ? undefined : { opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            {t("tapToOpen")}
          </m.span>

          <div className="gate-veil pointer-events-none absolute inset-0 bg-(--inv-paper) opacity-0" />
        </button>
      ) : null}
    </div>
  );
}

function Fold({ clip, shade }: { clip: string; shade: string }) {
  return (
    <div className="absolute inset-0" style={{ clipPath: clip, background: shade }}>
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: PAPER_GRAIN }} />
    </div>
  );
}
