/** One "name — link" per line; the link is last on its line so RTL text cannot wrap it. */
export function pendingLinksText(rows: { name: string; link: string }[]): string {
  return rows.map((r) => `${r.name} — ${r.link}`).join("\n");
}
