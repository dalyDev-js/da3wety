export type CountdownParts = { days: number; hours: number; minutes: number };

/** Whole days/hours/minutes until `target`; null once it has passed. */
export function countdownParts(target: Date, now: Date): CountdownParts | null {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return null;
  const minutesTotal = Math.floor(ms / 60_000);
  return {
    days: Math.floor(minutesTotal / (60 * 24)),
    hours: Math.floor((minutesTotal % (60 * 24)) / 60),
    minutes: minutesTotal % 60,
  };
}
