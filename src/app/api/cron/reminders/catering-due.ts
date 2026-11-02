import { addDays, daysBetween } from "@/lib/catering/dates";

/*
 * What the daily cron owes a catering booking today (pure, so it's testable).
 * Today is the owner's date. The cron runs once a day, so windows are inclusive
 * ranges rather than exact days: a missed run is caught up the next day.
 */

export type CateringJob =
  | "mark_balance_due"
  | "balance_reminder_7d"
  | "balance_reminder_2d"
  | "balance_overdue"
  | "day_before"
  | "mark_completed";

export type DueBooking = {
  status: string;
  event_date: string;
  balance_due_date: string | null;
  balance_cents: number;
  balance_paid_at: string | null;
  /** Owner's date the deposit was paid; no reminder the same day as booking. */
  deposit_paid_date: string | null;
};

export function cateringJobs(b: DueBooking, today: string): CateringJob[] {
  const held =
    b.status === "confirmed" || b.status === "balance_due" || b.status === "paid_in_full";
  if (!held) return [];
  if (b.event_date < today) return ["mark_completed"];

  const jobs: CateringJob[] = [];
  const owes =
    b.status !== "paid_in_full" && b.balance_cents > 0 && !b.balance_paid_at && b.balance_due_date;
  if (owes && b.balance_due_date) {
    const days = daysBetween(today, b.balance_due_date);
    if (b.status === "confirmed" && days <= 0) jobs.push("mark_balance_due");
    const justBooked = b.deposit_paid_date === today;
    if (!justBooked && days > 2 && days <= 7) jobs.push("balance_reminder_7d");
    if (!justBooked && days >= 0 && days <= 2) jobs.push("balance_reminder_2d");
    if (days < 0) jobs.push("balance_overdue");
  }
  if (b.event_date === addDays(today, 1)) jobs.push("day_before");
  return jobs;
}
