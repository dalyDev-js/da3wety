import { describe, expect, it } from "vitest";

import { pendingLinksText } from "@/lib/share-text";

describe("pendingLinksText", () => {
  it("puts each guest on its own line with the link last", () => {
    expect(
      pendingLinksText([
        { name: "عمر", link: "https://x/i/a" },
        { name: "Sara", link: "https://x/i/b" },
      ]),
    ).toBe("عمر — https://x/i/a\nSara — https://x/i/b");
  });

  it("is empty for no rows", () => {
    expect(pendingLinksText([])).toBe("");
  });
});
