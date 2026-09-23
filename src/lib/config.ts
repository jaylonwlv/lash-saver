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

/**
 * Processing fee on each deposit, kept by Lash Saver as the Stripe application
 * fee. It covers Stripe's card fee (which the platform pays on destination
 * charges) with a small margin. Not refunded when a deposit is refunded,
 * because Stripe doesn't return its fee either.
 */
export const PROCESSING_FEE_BPS = 350; // 3.5%
export const PROCESSING_FEE_FIXED_CENTS = 30;
export const PROCESSING_FEE_LABEL = "3.5% + 30¢";

/** Tech subscription. The trial starts when the tech adds a card, before their first pay link. */
export const SUBSCRIPTION_PRICE_CENTS = 2900;
export const TRIAL_DAYS = 30;
export const SUBSCRIPTION_NAME = "Lash Saver";
/** Send the "trial ending" email this many days before the first charge. */
export const TRIAL_ENDING_NOTICE_DAYS = 3;

/** Reminder offsets before an appointment, in hours. */
export const REMINDER_OFFSETS_HOURS = [48, 24] as const;
