import { describe, expect, it } from "vitest";

import { EgyptianPhone, maskPhone, normalizeEgyptianPhone, whatsappDigits } from "@/lib/validation/phone";

describe("normalizeEgyptianPhone", () => {
  it.each([
    ["01012345678", "01012345678"],
    ["+201012345678", "01012345678"],
    ["00201012345678", "01012345678"],
    ["201012345678", "01012345678"],
    ["010 1234 5678", "01012345678"],
    ["010-1234-5678", "01012345678"],
    ["(010) 1234 5678", "01012345678"],
    ["٠١٠١٢٣٤٥٦٧٨", "01012345678"],
    ["+٢٠ ١٠١٢٣٤٥٦٧٨", "01012345678"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeEgyptianPhone(input)).toBe(expected);
  });
});

describe("EgyptianPhone schema", () => {
  it("accepts the four mobile prefixes and returns E.164", () => {
    for (const prefix of ["010", "011", "012", "015"]) {
      const r = EgyptianPhone.safeParse(`${prefix}12345678`);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data).toBe(`+20${prefix.slice(1)}12345678`);
    }
  });

  it("rejects landlines, wrong prefixes and wrong lengths", () => {
    for (const bad of ["0212345678", "01312345678", "0101234567", "010123456789", "", "abc", "+441234567890"]) {
      expect(EgyptianPhone.safeParse(bad).success).toBe(false);
    }
  });

  it("reports a translatable validation key, not prose", () => {
    const r = EgyptianPhone.safeParse("123");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("phoneInvalid");
  });
});

describe("helpers", () => {
  it("whatsappDigits strips the plus", () => {
    expect(whatsappDigits("+201012345678")).toBe("201012345678");
  });

  it("maskPhone keeps only the last three digits", () => {
    expect(maskPhone("+201012345678")).toBe("•••• •••• 678");
    expect(maskPhone(null)).toBe("");
  });
});
