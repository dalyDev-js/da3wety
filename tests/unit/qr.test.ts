import { describe, expect, it } from "vitest";

import { parseScanInput, ticketUrl } from "@/lib/qr";

const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";

describe("parseScanInput", () => {
  it("extracts the token from a ticket URL or accepts it bare", () => {
    expect(parseScanInput(`https://da3wety.com/q/${TOKEN}`)).toEqual({ kind: "qr", value: TOKEN });
    expect(parseScanInput(` ${TOKEN} `)).toEqual({ kind: "qr", value: TOKEN });
  });

  it("normalizes short codes typed by staff", () => {
    expect(parseScanInput("abc-123")).toEqual({ kind: "short", value: "ABC123" });
    expect(parseScanInput("A B C 1 2 3")).toEqual({ kind: "short", value: "ABC123" });
    expect(parseScanInput("AIO-L23")).toEqual({ kind: "short", value: "A10123" });
  });

  it("rejects garbage and foreign URLs", () => {
    expect(parseScanInput("")).toBeNull();
    expect(parseScanInput("hello world")).toBeNull();
    expect(parseScanInput("https://evil.example/q/not-a-token")).toBeNull();
  });
});

describe("ticketUrl", () => {
  it("joins without a double slash", () => {
    expect(ticketUrl("https://da3wety.com/", TOKEN)).toBe(`https://da3wety.com/q/${TOKEN}`);
  });
});
