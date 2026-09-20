import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const info = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage: { from: () => ({ info }) } }) }));
import { PHOTO_MAX_BYTES, validPhotoObject } from "@/lib/storage";

describe("stored photo metadata validation", () => {
  beforeEach(() => info.mockReset());
  it.each([
    { size: 0, contentType: "image/jpeg" },
    { size: PHOTO_MAX_BYTES + 1, contentType: "image/jpeg" },
    { size: 100, contentType: "image/svg+xml" },
    { contentType: "image/jpeg" },
  ])("rejects invalid metadata %j", async (data) => {
    info.mockResolvedValue({ data, error: null });
    expect(await validPhotoObject("fixture.jpg")).toBe(false);
  });
  it("fails closed on missing objects and accepts bounded raster images", async () => {
    info.mockResolvedValueOnce({ data: null, error: new Error("Missing") });
    expect(await validPhotoObject("fixture.jpg")).toBe(false);
    info.mockResolvedValueOnce({ data: { size: 100, contentType: "image/jpeg" }, error: null });
    expect(await validPhotoObject("fixture.jpg")).toBe(true);
  });
});
