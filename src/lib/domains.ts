/**
 * "Your own website": prices and the rules for which names can be bought. No server
 * deps (the dashboard, the server and the tests share it). Must match the check on
 * public.custom_domains in 20261026000000_custom_domains.sql.
 */

export const DOMAIN_YEARLY_CENTS = 9900;
export const DOMAIN_MONTHLY_CENTS = 1000;
/** Monthly only: covers the registration, so a pro who pays once and leaves costs nothing. */
export const DOMAIN_SETUP_CENTS = 1500;
export const DOMAIN_PRODUCT_NAME = "Your own website";

export type DomainPlan = "yearly" | "monthly";
export const DOMAIN_PLANS: DomainPlan[] = ["yearly", "monthly"];

/** Endings we sell. Premium names and pricey endings would eat the margin. */
export const DOMAIN_TLDS = ["com", "pro"] as const;
export type DomainTld = (typeof DOMAIN_TLDS)[number];

/**
 * The most a name may cost us, first year or renewal. The monthly plan's first charge
 * ($25) must cover the registration plus Stripe's fee.
 */
export const MAX_DOMAIN_COST_CENTS = 2200;

/** What the pro pays first: a year, or a month plus setup. */
export function firstChargeCents(plan: DomainPlan): number {
  return plan === "yearly" ? DOMAIN_YEARLY_CENTS : DOMAIN_MONTHLY_CENTS + DOMAIN_SETUP_CENTS;
}

/**
 * "Studio Nova!" → "studionova": the name part of a domain, or null if nothing usable
 * is left. Letters, digits and inner hyphens, up to 63 characters (DNS label rules).
 */
export function domainLabel(input: string): string | null {
  const label = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(com|pro)$/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return label.length >= 1 && label.length <= 63 ? label : null;
}

/** "studionova.com" if it's a name we sell, else null. */
export function sellableDomain(input: string): string | null {
  const match = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.([a-z]+)$/.exec(
    input.trim().toLowerCase(),
  );
  if (!match || !(DOMAIN_TLDS as readonly string[]).includes(match[2])) return null;
  return `${match[1]}.${match[2]}`;
}

/** Dollars from the registrar (a number or "12.50") to whole cents, or null. */
export function registrarPriceCents(value: number | string | undefined): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Cheap enough to offer: both the first year and the renewal under the cap. */
export function affordable(purchaseCents: number | null, renewalCents: number | null): boolean {
  return (
    purchaseCents !== null &&
    renewalCents !== null &&
    purchaseCents <= MAX_DOMAIN_COST_CENTS &&
    renewalCents <= MAX_DOMAIN_COST_CENTS
  );
}

/** "(702) 555-0134" → "+17025550134": US numbers only for now (the registrar wants E.164). */
export function usPhoneE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
