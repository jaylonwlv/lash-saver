/*
 * Catering dates are wall-clock dates ("2027-06-14") in the owner's time zone.
 * Pure helpers shared by the host's page and the server. No server deps.
 */
import { wallClockParts } from "@/lib/time";

/** Today's date in `timeZone`. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return wallClockParts(now, timeZone).date;
}

/** `date` plus `days` (may be negative). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`. */
export function daysBetween(from: string, to: string): number {
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}

export type Window = { min_notice_days: number; max_advance_days: number };

/** First and last bookable dates. */
export function bookableRange(today: string, w: Window): { first: string; last: string } {
  return { first: addDays(today, w.min_notice_days), last: addDays(today, w.max_advance_days) };
}

export type DateState = "ok" | "too_soon" | "too_far" | "blocked" | "full";

export function dateState(
  date: string,
  today: string,
  w: Window & { daily_capacity: number },
  blocked: ReadonlySet<string>,
  heldCounts: ReadonlyMap<string, number>,
): DateState {
  const { first, last } = bookableRange(today, w);
  if (date < first) return "too_soon";
  if (date > last) return "too_far";
  if (blocked.has(date)) return "blocked";
  if ((heldCounts.get(date) ?? 0) >= w.daily_capacity) return "full";
  return "ok";
}

/** The event is inside the balance window: the whole total is due now. */
export function payInFullNow(
  eventDate: string,
  today: string,
  balanceDueDaysBefore: number,
): boolean {
  return daysBetween(today, eventDate) <= balanceDueDaysBefore;
}

/**
 * The day the host's page priced the quote, if the server should honor it: today,
 * or yesterday for a page opened before midnight and paid after.
 */
export function honoredQuoteDay(quoteDay: string, today: string): string {
  return quoteDay === addDays(today, -1) ? quoteDay : today;
}

/** When the balance is due: `balanceDueDaysBefore` days before the event. */
export function balanceDueDate(eventDate: string, balanceDueDaysBefore: number): string {
  return addDays(eventDate, -balanceDueDaysBefore);
}

/** Minutes between two "HH:MM" times on the same day (negative if end is earlier). */
export function minutesBetween(start: string, end: string): number {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return m(end) - m(start);
}

/** "Saturday, June 14, 2027" */
export function formatEventDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "Jun 14" */
export function formatShortDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "5:30 PM" from "17:30" or "17:30:00". */
export function formatClock(time: string): string {
  const h = Number(time.slice(0, 2));
  const m = time.slice(3, 5);
  return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}
