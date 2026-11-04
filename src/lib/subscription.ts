import { MIN_TRIAL_DAYS, TRIAL_DAYS } from "@/lib/config";

/*
 * Subscription status helpers without server dependencies, so any page can use them.
 * Status values mirror Stripe's subscription.status.
 */

/** Statuses that allow creating new pay links. past_due gets a grace period while Stripe retries. */
const SENDING_ALLOWED = new Set(["trialing", "active", "past_due"]);

export function canSendPayLinks(status: string | null | undefined): boolean {
  return status ? SENDING_ALLOWED.has(status) : false;
}

/**
 * Whether a pro may create a pay link now: always with a live subscription, and once
 * without one, for their very first (they add a card for the second; the trial counts
 * from sign-up, trialEndFor). Mirrors the "techs create pay links" policy (20261011000000).
 */
export function canCreatePayLink(
  status: string | null | undefined,
  payLinksSoFar: number,
): boolean {
  return canSendPayLinks(status) || payLinksSoFar === 0;
}

/**
 * When the free trial ends for a pro adding their card now: 30 days after they signed
 * up, but never sooner than MIN_TRIAL_DAYS from now. So the trial matches "free for 30
 * days" and active pros start paying around day 30, however late they add the card.
 */
export function trialEndFor(signedUpAt: Date, now: Date = new Date()): Date {
  const day = 86_400_000;
  return new Date(
    Math.max(signedUpAt.getTime() + TRIAL_DAYS * day, now.getTime() + MIN_TRIAL_DAYS * day),
  );
}

/** Gmail ignores dots and +tags; everyone ignores +tags and case. */
export function normalizeEmail(email: string): string {
  const [rawLocal, rawDomain = ""] = email.trim().toLowerCase().split("@");
  const domain = rawDomain === "googlemail.com" ? "gmail.com" : rawDomain;
  let local = rawLocal.split("+")[0];
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

/** QA test accounts (someone+dibsqa@…, or +run2+dibsqa@…): kept out of ad measurement. */
export function isTestAccountEmail(email: string | null | undefined): boolean {
  return Boolean(email && /\+dibsqa@/i.test(email));
}
