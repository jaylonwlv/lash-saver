/*
 * Times are stored in UTC and shown in the tech's time zone (profiles.timezone).
 * These helpers use Intl only, so they work the same on the server and in the browser.
 */

/** Milliseconds to add to UTC to get wall-clock time in `timeZone` at `date`. */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wallAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock date ("2026-10-03") and time ("14:30") in `timeZone` to
 * a UTC Date. Returns null for invalid input or a time skipped by a DST change.
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  const wall = Date.UTC(y, mo - 1, da, h, mi);
  if (Number.isNaN(wall)) return null;

  // Two passes handle times near a DST change.
  let utc = wall - zoneOffsetMs(new Date(wall), timeZone);
  utc = wall - zoneOffsetMs(new Date(utc), timeZone);

  const result = new Date(utc);
  const check = wallClockParts(result, timeZone);
  return check.date === date && check.time === time ? result : null;
}

/** The date ("2026-10-03") and time ("14:30") of `date` on a wall clock in `timeZone`. */
export function wallClockParts(date: Date, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** "Oct 23" (or "Oct 23, 2027" outside the current year) */
export function formatDate(value: string | Date, timeZone: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const sameYear =
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric" }).format(date) ===
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric" }).format(new Date());
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

/** "Fri, Oct 3 at 2:30 PM CDT" */
export function formatWhen(value: string | Date, timeZone: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
  return `${day} at ${time}`;
}
