/**
 * Minimal structured logging: one JSON line per entry so Vercel log drains can parse it.
 */
type Level = "info" | "warn" | "error";

type Fields = Record<string, unknown>;

function write(level: Level, scope: string, message: string, fields?: Fields) {
  const entry = { ts: new Date().toISOString(), level, scope, message, ...fields };
  const line = JSON.stringify(entry, (_k, v) => (v instanceof Error ? { name: v.name, message: v.message } : v));
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (scope: string, message: string, fields?: Fields) => write("info", scope, message, fields),
  warn: (scope: string, message: string, fields?: Fields) => write("warn", scope, message, fields),
  error: (scope: string, message: string, fields?: Fields) => write("error", scope, message, fields),
};
