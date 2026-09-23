/**
 * App-wide constants. Anything a tech can change lives in the database, not here.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Lash Saver";

export const DEFAULT_CURRENCY = "usd";

/** Suggested deposit for new services, as a percentage of the service price. */
export const DEFAULT_DEPOSIT_PERCENT = 25;

/** How long a pay link stays valid (never past the appointment start). */
export const PAY_LINK_VALID_HOURS = 24;

/** Lifetime of one Stripe Checkout session. Stripe's minimum is 30 minutes. */
export const CHECKOUT_SESSION_MINUTES = 35;

/** Reminder offsets before an appointment, in hours. */
export const REMINDER_OFFSETS_HOURS = [48, 24] as const;
