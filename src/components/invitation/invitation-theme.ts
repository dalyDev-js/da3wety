import type { CSSProperties } from "react";

import { THEME_IDS, type ThemeId } from "@/db/schema/enums";

/**
 * Invitation palettes. Everything colour-related on guest pages derives from
 * one of these: card stock and ink, the envelope's paper shades, the scratch
 * foil tones and the confetti. Exposed as CSS variables by
 * `invitationThemeStyle` so server and client components share one source.
 */
export type InvitationTheme = {
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  gold: string;
  goldSoft: string;
  envelope: {
    flap: string;
    flapDeep: string;
    fold: string;
    foldDeep: string;
    liner: string;
    back: string;
    monogram: string;
  };
  foil: { base: string; light: string; dark: string; bright: string; glitter: string };
  confetti: string[];
};

export const THEMES: Record<ThemeId, InvitationTheme> = {
  ivory: {
    paper: "#f3ebdd",
    ink: "#2a1a1d",
    muted: "#7a6a66",
    accent: "#5e1f2a",
    gold: "#b9933e",
    goldSoft: "#e2d3a6",
    envelope: {
      flap: "#f4ede0",
      flapDeep: "#e4dac8",
      fold: "#efe7d8",
      foldDeep: "#e8dfcd",
      liner: "#d9cfbb",
      back: "#e3d9c6",
      monogram: "#dcd2bf",
    },
    foil: { base: "#ded0b0", light: "#ece2c8", dark: "#bea878", bright: "#f6eeda", glitter: "#fffaeb" },
    confetti: ["#b9933e", "#d4b96a", "#e2d3a6", "#f3ebdd", "#8c6d2f"],
  },
  sage: {
    paper: "#eef0e6",
    ink: "#1f2a22",
    muted: "#66715f",
    accent: "#3f5a3f",
    gold: "#a8925a",
    goldSoft: "#d9d0b0",
    envelope: {
      flap: "#e9ecdf",
      flapDeep: "#d6dbc9",
      fold: "#e3e7d8",
      foldDeep: "#d9decc",
      liner: "#c6ccb4",
      back: "#d2d8c3",
      monogram: "#cfd5c0",
    },
    foil: { base: "#cfd4bd", light: "#e0e4d0", dark: "#a9b08f", bright: "#eef1e2", glitter: "#fbfcf4" },
    confetti: ["#a8925a", "#c9b985", "#d9d0b0", "#eef0e6", "#6f7f5a"],
  },
  navy: {
    paper: "#f6efe9",
    ink: "#1a2238",
    muted: "#6b6f7c",
    accent: "#233457",
    gold: "#c39a5a",
    goldSoft: "#e9d6b5",
    envelope: {
      flap: "#2a3b63",
      flapDeep: "#1e2c4c",
      fold: "#26365b",
      foldDeep: "#1f2e4f",
      liner: "#f1e4d6",
      back: "#34466f",
      monogram: "#c39a5a",
    },
    foil: { base: "#e4d3b6", light: "#f0e3cc", dark: "#c3a878", bright: "#f8f0e0", glitter: "#fffaf0" },
    confetti: ["#c39a5a", "#e9d6b5", "#f6efe9", "#d9b88a", "#233457"],
  },
  noir: {
    paper: "#111111",
    ink: "#f2e9d8",
    muted: "#a89f90",
    accent: "#d4af61",
    gold: "#d4af61",
    goldSoft: "#7a6435",
    envelope: {
      flap: "#1c1c1c",
      flapDeep: "#0d0d0d",
      fold: "#181818",
      foldDeep: "#101010",
      liner: "#3a3122",
      back: "#242424",
      monogram: "#d4af61",
    },
    foil: { base: "#2b2519", light: "#4a3f2a", dark: "#1a160f", bright: "#6b5a38", glitter: "#f0d68a" },
    confetti: ["#d4af61", "#f0d68a", "#7a6435", "#f2e9d8", "#b28f4a"],
  },
};

export const DEFAULT_THEME_ID: ThemeId = "ivory";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export function getTheme(id: ThemeId | null | undefined): InvitationTheme {
  return isThemeId(id) ? THEMES[id] : THEMES[DEFAULT_THEME_ID];
}

export function invitationThemeStyle(id: ThemeId | null | undefined): CSSProperties {
  const t = getTheme(id);
  return {
    "--inv-paper": t.paper,
    "--inv-ink": t.ink,
    "--inv-muted": t.muted,
    "--inv-accent": t.accent,
    "--inv-gold": t.gold,
    "--inv-gold-soft": t.goldSoft,
    "--inv-env-flap": t.envelope.flap,
    "--inv-env-flap-deep": t.envelope.flapDeep,
    "--inv-env-fold": t.envelope.fold,
    "--inv-env-fold-deep": t.envelope.foldDeep,
    "--inv-env-liner": t.envelope.liner,
    "--inv-env-back": t.envelope.back,
    "--inv-env-monogram": t.envelope.monogram,
  } as CSSProperties;
}
