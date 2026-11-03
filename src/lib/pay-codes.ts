/**
 * Short pay link codes (getdibs.pro/pay/k7m2x9qa4h). The database makes them
 * (new_pay_code() in 20261024000000_short_pay_links.sql); this is the shape the
 * pay page accepts. No server deps.
 */

/** No 0/o or 1/l/i, so a code read aloud or retyped still works. Must match the SQL. */
export const PAY_CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const PAY_CODE_LENGTH = 10;

const PAY_CODE = new RegExp(`^[${PAY_CODE_ALPHABET}]{${PAY_CODE_LENGTH}}$`);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A short code, lowercased (in case a phone capitalized it), or null. */
export function normalizePayCode(value: string): string | null {
  const code = value.toLowerCase();
  return PAY_CODE.test(code) ? code : null;
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** The pay page path: the short code once the appointment has one, else the old id link. */
export function payPath(a: { id: string; pay_code?: string | null }): string {
  return `/pay/${a.pay_code || a.id}`;
}
