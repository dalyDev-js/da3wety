import { describe, expect, it } from "vitest";
import { pageNumber } from "@/lib/pagination";

describe("pagination boundary", () => {
  it.each([undefined, "bad", "Infinity", -1, 0, 1.5, Number.MAX_VALUE])("normalizes invalid input %s", (value) => {
    expect(pageNumber(value)).toBe(1);
  });
  it("supports query arrays and bounds expensive offsets", () => {
    expect(pageNumber(["3", "4"])).toBe(3);
    expect(pageNumber(2000000)).toBe(1000000);
  });
});
