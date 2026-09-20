import { describe, expect, it } from "vitest";

import { safeNext } from "@/lib/safe-next";

describe("safeNext", () => {
  it("accepts relative paths", () => {
    expect(safeNext("/dashboard/events/1?tab=guests")).toBe("/dashboard/events/1?tab=guests");
  });

  it("falls back for missing, absolute, protocol-relative or malformed values", () => {
    expect(safeNext(undefined)).toBe("/dashboard");
    expect(safeNext(null, "/")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
    expect(safeNext("/\t/evil.example")).toBe("/dashboard");
    expect(safeNext("/ok\r\nSet-Cookie: x")).toBe("/dashboard");
  });

  it("uses the first value of an array", () => {
    expect(safeNext(["/a", "/b"])).toBe("/a");
  });
});
