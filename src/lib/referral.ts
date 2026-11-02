/*
 * "Powered by Dibs" links on pay links, menu pages and client emails: a client who
 * is a pro too can tap through. The link carries the slug of the pro whose page it
 * was (?ref=), remembered on the phone for a week and saved on the new pro's profile
 * (profiles.referred_by) so we can see which pros bring others. No discounts or
 * rewards are attached. No server deps.
 */

/** Where the invite was seen, as utm_source. */
export type InviteSource = "paylink" | "menu" | "email";

/** Same shape as a menu page slug (profile/schema.ts SLUG_PATTERN). */
export const REF_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
export const REF_KEY = "dibs:ref";
export const REF_DAYS = 7;

export function inviteUrl(appUrl: string, slug: string | null, source: InviteSource): string {
  const url = new URL("/", appUrl);
  if (slug && REF_PATTERN.test(slug)) url.searchParams.set("ref", slug);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "referral");
  return url.toString();
}

/** The remembered ref, if it's still within the window. */
export function readRef(raw: string | null, now = Date.now()): string | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const { slug, at } = v as { slug?: unknown; at?: unknown };
    if (typeof slug !== "string" || !REF_PATTERN.test(slug) || typeof at !== "number") return null;
    return now - at <= REF_DAYS * 86_400_000 ? slug : null;
  } catch {
    return null;
  }
}
