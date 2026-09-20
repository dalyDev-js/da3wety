import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => ({ value: "reviewSession123" }), set: vi.fn() }),
}));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: async () => {},
  requestIp: async () => "127.0.0.1",
  RateLimitedError: class extends Error {},
}));
vi.mock("@/lib/auth", () => ({ requireHost: async () => ({ id: fixture.hostId }) }));
const fixture = vi.hoisted(() => ({ hostId: "" }));

import { db } from "@/db";
import { events, guests, packages, rsvps, photos } from "@/db/schema";
import { reservePhotoUpload, confirmPhotoUpload } from "@/actions/photos";
import { recordCheckin } from "@/actions/checkin";
import { addGuest } from "@/actions/guests";
import { submitOpenRsvp } from "@/actions/rsvp";
import { searchGuestsForScanner } from "@/db/queries/guests";
import { guestToken, scannerToken, slug as makeSlug } from "@/lib/tokens";

const enabled = process.env.RUN_INTEGRATION === "1";
describe.skipIf(!enabled)("review security regressions (local database)", () => {
  const eventId = randomUUID();
  const guestId = randomUUID();
  const staffToken = scannerToken();
  const slug = makeSlug();
  let admin: ReturnType<typeof createClient>;
  let photoCap = 0;
  const uploadedPaths: string[] = [];

  beforeAll(async () => {
    for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "DATABASE_URL"]) {
      if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env[key]!).hostname))
        throw new Error("Local fixtures only");
    }
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
    const result = await admin.auth.admin.createUser({
      email: `review-${randomUUID()}@example.com`,
      email_confirm: true,
    });
    if (result.error) throw result.error;
    fixture.hostId = result.data.user.id;
    const [pkg] = await db.select().from(packages).where(eq(packages.checkinEnabled, true));
    if (!pkg) throw new Error("Seed packages first");
    photoCap = pkg.maxPhotos;
    await db.insert(events).values({
      id: eventId,
      hostId: fixture.hostId,
      slug,
      title: "Review fixture",
      honoreePrimary: "Review",
      startsAt: new Date(),
      status: "published",
      packageTier: pkg.tier,
      checkinEnabled: true,
      galleryEnabled: true,
      scannerToken: staffToken,
      scannerTokenExpiresAt: new Date(Date.now() + 3600000),
    });
    await db
      .insert(guests)
      .values({ id: guestId, eventId, name: "Alice Review", phone: "+201012345678", token: guestToken(), maxSeats: 1 });
    await db.insert(rsvps).values({ eventId, guestId, status: "attending", seats: 1 });
  });

  afterAll(async () => {
    if (fixture.hostId) {
      if (uploadedPaths.length) {
        const result = await admin.storage.from("event-photos").remove(uploadedPaths);
        if (result.error) throw result.error;
      }
      await db.delete(events).where(eq(events.hostId, fixture.hostId));
      const result = await admin.auth.admin.deleteUser(fixture.hostId);
      if (result.error) throw result.error;
    }
  });

  it("does not reveal or modify an existing invitation by matching a phone", async () => {
    const form = new FormData();
    Object.entries({ name: "Attacker", phone: "01012345678", status: "declined", seats: "1" }).forEach(([key, value]) =>
      form.set(key, value),
    );
    const result = await submitOpenRsvp(slug, { status: "idle" }, form);
    expect(result).toMatchObject({ status: "error", formError: "usePersonalLink" });
    const [response] = await db.select().from(rsvps).where(eq(rsvps.guestId, guestId));
    expect(response.status).toBe("attending");
  });

  it("name searches do not match every non-null phone", async () => {
    expect(await searchGuestsForScanner(eventId, "NobodyHere", 5)).toHaveLength(0);
    expect(await searchGuestsForScanner(eventId, "Alice", 5)).toHaveLength(1);
  });

  it("rejects missing/foreign QR references", async () => {
    expect(await recordCheckin(staffToken, { guestId, qrTokenId: null, seats: 1, method: "qr" })).toEqual({
      ok: false,
    });
    expect(await recordCheckin(staffToken, { guestId, qrTokenId: randomUUID(), seats: 1, method: "qr" })).toEqual({
      ok: false,
    });
  });

  it("concurrent scanners admit the last seat only once", async () => {
    const results = await Promise.all(
      [1, 2].map(() => recordCheckin(staffToken, { guestId, qrTokenId: null, seats: 1, method: "manual" })),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it("rejects a declined RSVP", async () => {
    await db.update(rsvps).set({ status: "declined", seats: 0 }).where(eq(rsvps.guestId, guestId));
    expect(await recordCheckin(staffToken, { guestId, qrTokenId: null, seats: 1, method: "manual" })).toEqual({
      ok: false,
    });
  });

  it("confirms real uploaded raster files and rejects confirmation once closed", async () => {
    const ref = { kind: "slug" as const, value: slug };
    const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } })
      .jpeg()
      .toBuffer();
    const reservation = await reservePhotoUpload({
      ref,
      sizeBytes: bytes.length,
      thumbBytes: bytes.length,
      width: 2,
      height: 2,
    });
    if (!reservation.ok) throw new Error("Reservation failed");
    try {
      for (const upload of [reservation.main, reservation.thumb]) {
        uploadedPaths.push(upload.path);
        const result = await admin.storage
          .from(reservation.bucket)
          .uploadToSignedUrl(upload.path, upload.token, bytes, { contentType: "image/jpeg" });
        if (result.error) throw result.error;
        const metadata = await admin.storage.from(reservation.bucket).info(upload.path);
        expect(metadata.error).toBeNull();
        expect(metadata.data).toMatchObject({ size: bytes.length, contentType: "image/jpeg" });
      }
      expect(await confirmPhotoUpload(ref, reservation.photoId)).toEqual({ ok: true });
      await db.update(events).set({ galleryEnabled: false }).where(eq(events.id, eventId));
      expect(await confirmPhotoUpload(ref, reservation.photoId)).toEqual({ ok: false });
    } finally {
      await db.update(events).set({ galleryEnabled: true }).where(eq(events.id, eventId));
      await db.delete(photos).where(eq(photos.id, reservation.photoId));
    }
  }, 30000);

  it("reserves the last photo slot exactly once, including outstanding uploads", async () => {
    if (photoCap < 1 || photoCap > 5000) throw new Error("Expected bounded gallery package");
    await db.insert(photos).values(
      Array.from({ length: photoCap - 1 }, () => ({
        eventId,
        uploadSession: "fixture",
        storagePath: "fixture",
        thumbPath: "fixture",
      })),
    );
    const input = {
      ref: { kind: "slug" as const, value: slug },
      sizeBytes: 100,
      thumbBytes: 50,
      width: 10,
      height: 10,
    };
    const results = await Promise.all([1, 2].map(() => reservePhotoUpload(input)));
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.reason === "limit")).toHaveLength(1);
    const reserved = results.find((result) => result.ok);
    if (!reserved?.ok) throw new Error("Missing reservation");
    expect(await confirmPhotoUpload(input.ref, reserved.photoId)).toEqual({ ok: false });
    await db.update(events).set({ galleryEnabled: false }).where(eq(events.id, eventId));
    expect(await confirmPhotoUpload(input.ref, reserved.photoId)).toEqual({ ok: false });
  }, 30000);

  it("concurrent guest additions cannot exceed the package cap", async () => {
    const [pkg] = await db.select().from(packages).where(eq(packages.tier, "basic"));
    if (!pkg.maxGuests || pkg.maxGuests > 2000) throw new Error("Expected bounded basic package");
    const [event] = await db
      .insert(events)
      .values({
        hostId: fixture.hostId,
        slug: `cap${Date.now()}`,
        title: "Capacity",
        honoreePrimary: "Review",
        startsAt: new Date(),
      })
      .returning();
    await db.insert(guests).values(
      Array.from({ length: pkg.maxGuests - 1 }, (_, index) => ({
        eventId: event.id,
        name: `Guest ${index}`,
        token: guestToken(),
      })),
    );
    const form = new FormData();
    form.set("name", "Final guest");
    form.set("maxSeats", "1");
    const results = await Promise.all([1, 2].map(() => addGuest(event.id, { status: "idle" }, form)));
    expect(results.filter((result) => result.status === "success")).toHaveLength(1);
  });
});
