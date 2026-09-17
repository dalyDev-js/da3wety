import { describe, expect, it } from "vitest";

import { getTheme, invitationThemeStyle, THEMES } from "@/components/invitation/invitation-theme";
import { THEME_IDS } from "@/db/schema/enums";

const HEX = /^#[0-9a-f]{6}$/i;

describe("invitation themes", () => {
  it("defines every theme id with complete colours", () => {
    for (const id of THEME_IDS) {
      const t = THEMES[id];
      for (const v of [
        t.paper,
        t.ink,
        t.muted,
        t.accent,
        t.gold,
        t.goldSoft,
        ...Object.values(t.envelope),
        ...Object.values(t.foil),
        ...t.confetti,
      ]) {
        expect(v, `${id}`).toMatch(HEX);
      }
      expect(t.confetti.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("falls back to ivory for unknown ids", () => {
    expect(getTheme(undefined)).toBe(THEMES.ivory);
    expect(getTheme("nope" as never)).toBe(THEMES.ivory);
  });

  it("emits the CSS variables the components read", () => {
    const style = invitationThemeStyle("navy") as Record<string, string>;
    for (const key of [
      "--inv-paper",
      "--inv-ink",
      "--inv-accent",
      "--inv-gold",
      "--inv-env-flap",
      "--inv-env-fold",
      "--inv-env-liner",
      "--inv-env-back",
      "--inv-env-monogram",
    ]) {
      expect(style[key], key).toMatch(HEX);
    }
    expect(style["--inv-paper"]).toBe(THEMES.navy.paper);
  });
});
