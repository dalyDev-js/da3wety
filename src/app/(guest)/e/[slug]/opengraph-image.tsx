import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { DEFAULT_INVITATION_THEME as theme } from "@/components/invitation/invitation-theme";
import { getEventBySlug } from "@/db/queries/events";
import { publicAssetUrl } from "@/lib/storage";

export const alt = "Da3wety invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The font is loaded once per instance; the event is read per request. generateMetadata
// versions the image URL with updatedAt so WhatsApp/Facebook caches miss after edits.
const fontBold = readFile(join(process.cwd(), "src/assets/fonts/Amiri-Bold.ttf"));

/**
 * Share preview: cover photo (or paper background) plus the honoree names.
 * Satori's Arabic shaping is unreliable for mixed runs, so only names are drawn,
 * each on its own line, with no dates or digits.
 */
export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getEventBySlug(slug);
  const event = ctx && ctx.event.status === "published" ? ctx.event : null;
  const cover = event?.coverImagePath ? publicAssetUrl(event.coverImagePath) : null;
  const names = event ? [event.honoreePrimary, event.honoreeSecondary].filter(Boolean) : ["دعوتي"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: theme.paper,
          fontFamily: "Amiri",
        }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover", width: "100%", height: "100%" }} />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: cover ? "linear-gradient(180deg, rgba(42,26,29,0) 35%, rgba(42,26,29,0.82) 100%)" : "transparent",
          }}
        />
        <div
          style={{
            position: "absolute",
            insetInline: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "48px 80px 56px",
            gap: 8,
            color: cover ? theme.paper : theme.ink,
          }}
        >
          {names.map((name) => (
            <div key={name} style={{ display: "flex", fontSize: names.length > 1 ? 84 : 104, lineHeight: 1.2, textAlign: "center" }}>
              {name}
            </div>
          ))}
          <div style={{ display: "flex", width: 240, height: 2, background: theme.gold, marginTop: 20 }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Amiri", data: await fontBold, weight: 700, style: "normal" }],
    },
  );
}
