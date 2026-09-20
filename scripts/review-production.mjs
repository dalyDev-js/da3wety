import { writeFile, readFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const base = process.env.REVIEW_BASE_URL || "http://localhost:3100";
const response = await fetch(`${base}/e/lhtestev01`, { headers: { "user-agent": "WhatsApp" } });
if (!response.ok) throw new Error(`Invitation HTTP ${response.status}`);
const html = await response.text();
const paths = [...new Set([...html.matchAll(/<script[^>]+src="([^"?]+\.js)(?:\?[^"]*)?"/g)].map((match) => match[1]))];
const chunks = await Promise.all(
  paths.map(async (path) => ({ path, gzip: gzipSync(await readFile(`.next/${path.replace("/_next/", "")}`)).length })),
);
const result = { chunks, totalGzip: chunks.reduce((sum, chunk) => sum + chunk.gzip, 0) };
await mkdir("test-results/review", { recursive: true });
await writeFile(`test-results/review/bundle-${process.argv[2] || "after"}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
const og = html.match(/<meta property="og:image" content="([^"]+)"/);
if (!og) throw new Error("Missing OG image");
const imageUrl = new URL(og[1].replaceAll("&amp;", "&"));
const image = await fetch(new URL(imageUrl.pathname + imageUrl.search, base));
if (!image.ok || !image.headers.get("content-type")?.includes("image/png")) throw new Error(`OG HTTP ${image.status}`);
await writeFile("test-results/review/arabic-og.png", Buffer.from(await image.arrayBuffer()));
console.log(`OG PNG passed: ${imageUrl.pathname}`);
