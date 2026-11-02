import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/env.public";

/*
 * Unsubscribe links for marketing email: "<tech id>.<signature>", so a link can't be
 * forged for someone else and needs no login. Signed with CRON_SECRET under its own
 * label, so the signature means nothing anywhere else.
 */

const sign = (techId: string) =>
  createHmac("sha256", serverEnv().CRON_SECRET)
    .update(`unsubscribe:${techId}`)
    .digest("base64url")
    .slice(0, 32);

export function unsubscribeToken(techId: string): string {
  return `${techId}.${sign(techId)}`;
}

/** The tech id, if the token is genuine. */
export function readUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const [techId, sig] = token.split(".");
  if (!techId || !sig || !/^[0-9a-f-]{36}$/i.test(techId)) return null;
  const expected = Buffer.from(sign(techId));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? techId : null;
}

/** The footer link (a page that asks first) and the one-click target (RFC 8058 POST). */
export function unsubscribeUrls(techId: string): { page: string; oneClick: string } {
  const t = encodeURIComponent(unsubscribeToken(techId));
  const base = publicEnv().NEXT_PUBLIC_APP_URL;
  return { page: `${base}/unsubscribe?t=${t}`, oneClick: `${base}/api/unsubscribe?t=${t}` };
}
