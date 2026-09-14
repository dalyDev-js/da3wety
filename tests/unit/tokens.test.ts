import { describe, expect, it } from "vitest";

import { formatShortCode, guestToken, normalizeShortCode, qrToken, scannerToken, shortCode, slug } from "@/lib/tokens";

const unique = (make: () => string, n = 500) => new Set(Array.from({ length: n }, make)).size;

describe("tokens", () => {
  it("slug is 10 lowercase alphanumerics, URL-safe and unique", () => {
    const s = slug();
    expect(s).toMatch(/^[a-z0-9]{10}$/);
    expect(unique(slug)).toBe(500);
  });

  it("guestToken is 16 URL-safe chars", () => {
    expect(guestToken()).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(unique(guestToken)).toBe(500);
  });

  it("scannerToken is 24 URL-safe chars", () => {
    expect(scannerToken()).toMatch(/^[A-Za-z0-9_-]{24}$/);
  });

  it("qrToken is 22-char base64url (128 bits)", () => {
    expect(qrToken()).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(unique(qrToken)).toBe(500);
  });

  it("shortCode is 6 Crockford base32 chars without ambiguous letters", () => {
    for (let i = 0; i < 200; i++) {
      const code = shortCode();
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/);
      expect(code).not.toMatch(/[ILOU]/);
    }
  });

  it("normalizeShortCode accepts hyphens, spaces, lowercase and confusable letters", () => {
    expect(normalizeShortCode("abc-123")).toBe("ABC123");
    expect(normalizeShortCode(" a b c 1 2 3 ")).toBe("ABC123");
    // Crockford decoding: I/L -> 1, O -> 0
    expect(normalizeShortCode("AIO-L23")).toBe("A101" + "23");
    expect(normalizeShortCode("")).toBe("");
  });

  it("formatShortCode inserts the display hyphen", () => {
    expect(formatShortCode("ABC123")).toBe("ABC-123");
  });
});
