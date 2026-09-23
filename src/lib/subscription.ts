/*
 * Subscription status helpers without server dependencies, so any page can use them.
 * Status values mirror Stripe's subscription.status.
 */

/** Statuses that allow creating new pay links. past_due gets a grace period while Stripe retries. */
const SENDING_ALLOWED = new Set(["trialing", "active", "past_due"]);

export function canSendPayLinks(status: string | null | undefined): boolean {
  return status ? SENDING_ALLOWED.has(status) : false;
}

/** Gmail ignores dots and +tags; everyone ignores +tags and case. */
export function normalizeEmail(email: string): string {
  const [rawLocal, rawDomain = ""] = email.trim().toLowerCase().split("@");
  const domain = rawDomain === "googlemail.com" ? "gmail.com" : rawDomain;
  let local = rawLocal.split("+")[0];
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}
