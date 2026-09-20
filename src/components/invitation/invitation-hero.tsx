"use client";

import { ChevronDownIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useState, type ReactNode } from "react";

import { FrameCorners } from "@/components/brand/frame-corners";
import { ScratchPhoto } from "@/components/invitation/scratch-photo";
import type { InvitationTheme } from "@/components/invitation/invitation-theme";

type Props = {
  photoSrc: string | null;
  photoAlt: string;
  foil: InvitationTheme["foil"];
  confetti: string[];
  /** Greeting, family names and the invite line: above the photo. */
  intro: ReactNode;
  /** Honoree names: below the photo. */
  names: ReactNode;
  /** Date line: last to appear. */
  date: ReactNode;
  /** Countdown shown after the date. */
  countdown?: ReactNode;
};

/**
 * First screen of the invitation: a framed card the height of the viewport,
 * the photo under its scratch foil in the middle, and the text fading in with
 * staggered delays once the photo is uncovered. Without a photo everything is
 * shown at once.
 */
export function InvitationHero({ photoSrc, photoAlt, foil, confetti, intro, names, date, countdown }: Props) {
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(photoSrc === null);

  const appear = (delay: number) => ({
    initial: false as const,
    animate: { opacity: revealed ? 1 : 0, y: revealed ? 0 : 10 },
    transition: {
      duration: reduceMotion ? 0 : 0.9,
      delay: revealed && !reduceMotion ? delay : 0,
      ease: "easeOut" as const,
    },
  });

  return (
    <section className="relative flex min-h-svh w-full items-center justify-center px-4 py-[max(env(safe-area-inset-top),1rem)]">
      <div className="relative mx-auto flex min-h-[min(100svh_-_2rem,52rem)] w-full max-w-[460px] flex-col items-center justify-center text-center">
        <FrameCorners />

        <div className="relative z-10 flex w-full flex-col items-center gap-6 px-[14%] py-[12%]">
          <m.div className="space-y-2" {...appear(0.3)}>
            {intro}
          </m.div>

          {photoSrc ? (
            <div className="w-full">
              <ScratchPhoto
                src={photoSrc}
                alt={photoAlt}
                foil={foil}
                confetti={confetti}
                onRevealed={() => setRevealed(true)}
              />
            </div>
          ) : null}

          <m.div className="w-full" {...appear(1.3)}>
            {names}
          </m.div>

          <m.div className="w-full" {...appear(2.3)}>
            {date}
          </m.div>

          {countdown ? (
            <m.div className="w-full" {...appear(3.1)}>
              {countdown}
            </m.div>
          ) : null}
        </div>

        <m.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center text-(--inv-muted)"
          initial={false}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ delay: revealed && !reduceMotion ? 3 : 0, duration: 0.8 }}
        >
          <m.span
            animate={reduceMotion ? undefined : { y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDownIcon className="size-5" />
          </m.span>
        </m.div>
      </div>
    </section>
  );
}
