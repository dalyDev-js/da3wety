import type { CSSProperties } from "react";

/**
 * Invitation palette as CSS variables on the invitation root, so per-event themes
 * can override them later without generating Tailwind classes at runtime.
 * Defaults: ivory card stock, dark ink, oxblood envelope, antique gold foil.
 */
export const DEFAULT_INVITATION_THEME = {
  paper: "#f3ebdd",
  ink: "#2a1a1d",
  muted: "#7a6a66",
  accent: "#5e1f2a",
  gold: "#b9933e",
  goldSoft: "#e2d3a6",
} as const;

export type InvitationTheme = typeof DEFAULT_INVITATION_THEME;

export function invitationThemeStyle(theme: Partial<InvitationTheme> = {}): CSSProperties {
  const t = { ...DEFAULT_INVITATION_THEME, ...theme };
  return {
    "--inv-paper": t.paper,
    "--inv-ink": t.ink,
    "--inv-muted": t.muted,
    "--inv-accent": t.accent,
    "--inv-gold": t.gold,
    "--inv-gold-soft": t.goldSoft,
  } as CSSProperties;
}
