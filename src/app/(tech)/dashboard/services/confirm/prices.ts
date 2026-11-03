import { dollarsToCents } from "@/lib/money";

/** Same limits as a single service (services/schema.ts) and the services table checks. */
const MIN_DEPOSIT_CENTS = 100;
const MAX_PRICE_CENTS = 1_000_000;

export type PriceRow =
  | { id: string; offer: true; price_cents: number; deposit_cents: number }
  | { id: string; offer: false };

/**
 * Reads the "Confirm your prices" form: for each example service, whether they offer
 * it and its price and deposit (fields offer_<id>, price_<id>, deposit_<id>).
 * Errors are keyed by field name so each one shows under its input.
 */
export function parsePrices(
  ids: string[],
  values: Record<string, string>,
  /** They already have services with their own prices, so hiding every example is fine. */
  othersSaved = false,
): { rows: PriceRow[] } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const rows: PriceRow[] = [];
  for (const id of ids) {
    if (values[`offer_${id}`] !== "on") {
      rows.push({ id, offer: false });
      continue;
    }
    const price = dollarsToCents(values[`price_${id}`] ?? "");
    const deposit = dollarsToCents(values[`deposit_${id}`] ?? "");
    if (price === null) errors[`price_${id}`] = "Enter a price, like 45 or 45.50.";
    else if (price > MAX_PRICE_CENTS) errors[`price_${id}`] = "That price is too high.";
    if (deposit === null) errors[`deposit_${id}`] = "Enter a deposit, like 20.";
    else if (deposit < MIN_DEPOSIT_CENTS) errors[`deposit_${id}`] = "At least $1.";
    else if (price !== null && deposit > price) errors[`deposit_${id}`] = "More than the price.";
    if (price !== null && deposit !== null && !errors[`price_${id}`] && !errors[`deposit_${id}`]) {
      rows.push({ id, offer: true, price_cents: price, deposit_cents: deposit });
    }
  }
  if (
    !othersSaved &&
    ids.length > 0 &&
    !rows.some((r) => r.offer) &&
    Object.keys(errors).length === 0
  ) {
    errors.form = "Keep at least one service on your page.";
  }
  return Object.keys(errors).length ? { errors } : { rows };
}
