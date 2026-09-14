import { describe, expect, it } from "vitest";

import { parseBulkGuests } from "@/lib/validation/guest";

describe("parseBulkGuests", () => {
  it("parses name, phone, seats and group with Latin or Arabic commas", () => {
    const text = ["أحمد محمود, 01012345678, 4, أهل العريس", "Sara Ali، ٠١١١٢٣٤٥٦٧٨، ٢", "Omar", ""].join("\n");
    const { guests, errors } = parseBulkGuests(text);
    expect(errors).toEqual([]);
    expect(guests).toEqual([
      { line: 1, name: "أحمد محمود", phone: "+201012345678", maxSeats: 4, groupLabel: "أهل العريس" },
      { line: 2, name: "Sara Ali", phone: "+201112345678", maxSeats: 2, groupLabel: undefined },
      { line: 3, name: "Omar", phone: undefined, maxSeats: 1, groupLabel: undefined },
    ]);
  });

  it("reports invalid lines with keys and keeps the good ones", () => {
    const { guests, errors } = parseBulkGuests("A\nMona, 123\nKarim, 01234567890, 99");
    expect(guests.map((g) => g.name)).toEqual([]);
    expect(errors).toEqual([
      { line: 1, key: "tooShort" },
      { line: 2, key: "phoneInvalid" },
      { line: 3, key: "seatsExceeded" },
    ]);
  });

  it("caps the number of guests", () => {
    const text = Array.from({ length: 5 }, (_, i) => `Guest ${i}`).join("\n");
    const { guests, errors } = parseBulkGuests(text, 3);
    expect(guests).toHaveLength(3);
    expect(errors).toHaveLength(2);
  });
});
