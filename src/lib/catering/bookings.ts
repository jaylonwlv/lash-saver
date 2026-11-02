import type { CateringBookingStatus, CateringEventType } from "@/lib/supabase/database.types";

/* Catering booking states and labels. No server deps. */

/** States that hold the date for good (the deposit is paid). */
export const HELD_STATUSES = [
  "confirmed",
  "balance_due",
  "paid_in_full",
] as const satisfies readonly CateringBookingStatus[];

/** States the owner can still cancel. */
export const ACTIVE_STATUSES = [
  "requested",
  "awaiting_deposit",
  ...HELD_STATUSES,
] as const satisfies readonly CateringBookingStatus[];

export function bookingStatusLabel(status: CateringBookingStatus): string {
  switch (status) {
    case "requested":
      return "Request";
    case "awaiting_deposit":
      return "Waiting for deposit";
    case "confirmed":
      return "Booked";
    case "balance_due":
      return "Balance due";
    case "paid_in_full":
      return "Paid in full";
    case "completed":
      return "Done";
    case "cancelled":
      return "Cancelled";
    case "declined":
      return "Declined";
    case "expired":
      return "Not paid";
  }
}

export const EVENT_TYPES: { id: CateringEventType; label: string }[] = [
  { id: "wedding", label: "Wedding" },
  { id: "corporate", label: "Corporate event" },
  { id: "birthday", label: "Birthday party" },
  { id: "graduation", label: "Graduation" },
  { id: "other", label: "Something else" },
];

export function eventTypeLabel(id: CateringEventType): string {
  return EVENT_TYPES.find((t) => t.id === id)?.label ?? "Event";
}

/** Minutes for an hour count, shown as "2 hours" / "2.5 hours". */
export function hoursLabel(minutes: number): string {
  const h = minutes / 60;
  const n = Number.isInteger(h) ? String(h) : h.toFixed(1);
  return `${n} hour${h === 1 ? "" : "s"}`;
}

/** The unpaid hold still has at least a minute left (enough to finish checkout). */
export function holdStillOpen(
  b: { status: CateringBookingStatus; hold_expires_at: string | null },
  now: Date = new Date(),
): boolean {
  return (
    b.status === "awaiting_deposit" &&
    !!b.hold_expires_at &&
    new Date(b.hold_expires_at).getTime() > now.getTime() + 60_000
  );
}
