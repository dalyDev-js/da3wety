import { join } from "node:path";
import sharp from "sharp";

import { ImageResponse } from "next/og";

import { getTheme } from "@/components/invitation/invitation-theme";
import { getEventBySlug } from "@/db/queries/events";
import { publicAssetUrl } from "@/lib/storage";

export const alt = "Da3wety invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateImageMetadata({ params }: { params: { slug: string } }) {
  const resolved = await params;
  if (!resolved.slug) return [];
  const ctx = await getEventBySlug(resolved.slug);
  return [
    {
      id: ctx?.event.status === "published" ? String(ctx.event.updatedAt.getTime()) : "unpublished",
      alt,
      size,
      contentType,
    },
  ];
}

function escapeMarkup(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!,
  );
}

/**
 * Share preview: cover photo (or paper background) plus the honoree names.
 * Names are shaped by Pango before compositing, including Arabic and mixed runs.
 */
export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getEventBySlug(slug);
  const event = ctx && ctx.event.status === "published" ? ctx.event : null;
  const theme = getTheme(event?.theme);
  const cover = event?.coverImagePath ? publicAssetUrl(event.coverImagePath) : null;
  const names = event ? [event.honoreePrimary, event.honoreeSecondary].filter(Boolean) : ["دعوتي"];
  // Pango/HarfBuzz shapes Arabic before Satori composites the resulting bitmap.
  const renderedNames = await Promise.all(
    names.map(async (name) => {
      const { data, info } = await sharp({
        text: {
          text: `<span foreground="${cover ? theme.paper : theme.ink}">${escapeMarkup(name!)}</span>`,
          font: `Amiri Bold ${names.length > 1 ? 84 : 104}`,
          fontfile: join(process.cwd(), "src/assets/fonts/Amiri-Bold.ttf"),
          width: 1040,
          height: 180,
          align: "centre",
          rgba: true,
        },
      })
        .png()
        .toBuffer({ resolveWithObject: true });
      return { src: `data:image/png;base64,${data.toString("base64")}`, width: info.width, height: info.height };
    }),
  );

  return new ImageResponse(
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
        <img
          src={cover}
          alt=""
          width={1200}
          height={630}
          style={{ position: "absolute", inset: 0, objectFit: "cover", width: "100%", height: "100%" }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          background: cover ? "linear-gradient(180deg, rgba(42,26,29,0) 35%, rgba(42,26,29,0.82) 100%)" : "transparent",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          width: "100%",
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "48px 80px 56px",
          gap: 8,
          color: cover ? theme.paper : theme.ink,
        }}
      >
        {renderedNames.map((name, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={index} src={name.src} width={name.width} height={name.height} alt="" />
        ))}
        <div style={{ display: "flex", width: 240, height: 2, background: theme.gold, marginTop: 20 }} />
      </div>
    </div>,
    {
      ...size,
    },
  );
}
