import { describe, expect, it } from "vitest";

import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

const arFlat = flatten(ar as Tree);
const enFlat = flatten(en as Tree);

describe("message catalogs", () => {
  it("ar.json and en.json have identical key sets", () => {
    const arKeys = Object.keys(arFlat).sort();
    const enKeys = Object.keys(enFlat).sort();
    expect(enKeys).toEqual(arKeys);
  });

  it("every Arabic plural lists all six CLDR forms", () => {
    const missing: string[] = [];
    for (const [key, value] of Object.entries(arFlat)) {
      if (!/\{\s*\w+\s*,\s*plural\s*,/.test(value)) continue;
      for (const form of ["zero", "one", "two", "few", "many", "other"]) {
        if (!new RegExp(`\\b${form}\\s*\\{`).test(value)) missing.push(`${key}: ${form}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every English plural has one and other", () => {
    for (const [key, value] of Object.entries(enFlat)) {
      if (!/\{\s*\w+\s*,\s*plural\s*,/.test(value)) continue;
      expect(value, key).toMatch(/\bone\s*\{/);
      expect(value, key).toMatch(/\bother\s*\{/);
    }
  });

  it("no message is empty", () => {
    for (const [key, value] of [...Object.entries(arFlat), ...Object.entries(enFlat)]) {
      expect(value.trim(), key).not.toBe("");
    }
  });
});
