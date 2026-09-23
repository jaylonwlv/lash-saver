import { REMINDER_OFFSETS_HOURS } from "@/lib/config";

/** Clients who paid this recently just got a confirmation email; skip the reminder. */
const JUST_PAID_HOURS = 12;

const HOUR = 3_600_000;

/**
 * Which reminder is due now, as hours-before (48, 24), or null. The cron job
 * may run only daily, so a reminder is "due" once the appointment is within its
 * offset; the notification_log check stops it from being sent twice.
 */
export function dueReminder(
  startsAt: Date,
  paidAt: Date | null,
  now: Date,
  offsets: readonly number[] = REMINDER_OFFSETS_HOURS,
): number | null {
  const hoursUntil = (startsAt.getTime() - now.getTime()) / HOUR;
  if (hoursUntil <= 0) return null;
  const due = [...offsets].sort((a, b) => a - b).find((offset) => hoursUntil <= offset);
  if (due === undefined) return null;
  if (paidAt && now.getTime() - paidAt.getTime() < JUST_PAID_HOURS * HOUR) return null;
  return due;
}

export const reminderLogKey = (offsetHours: number) => `appointment_reminder_${offsetHours}h`;
