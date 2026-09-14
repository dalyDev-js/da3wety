"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Loaded on demand so the animation runtime is not in the initial bundle.
const loadMotionFeatures = () =>
  import("@/lib/motion-features").then((m) => m.default);

type ProvidersProps = {
  direction: "rtl" | "ltr";
  children: ReactNode;
};

/**
 * Client-side providers shared by every root layout.
 * - MotionConfig respects the OS "reduce motion" preference (also for useAnimate sequences).
 * - LazyMotion + `m.*` components keep the motion bundle small; `strict` throws if a
 *   full `motion.*` component sneaks in.
 * - DirectionProvider makes Radix primitives honour RTL; they do not read <html dir>.
 */
export function Providers({ direction, children }: ProvidersProps) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures} strict>
        <DirectionProvider dir={direction}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-center" dir={direction} />
        </DirectionProvider>
      </LazyMotion>
    </MotionConfig>
  );
}
