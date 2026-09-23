import { DEFAULT_CURRENCY, PROCESSING_FEE_BPS, PROCESSING_FEE_FIXED_CENTS } from "@/lib/config";

/** All money is stored and passed around as integer cents. Format only at the edge. */
export function formatCents(cents: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Dibs's processing fee on a deposit (3.5% + 30¢), never more than the
 * deposit itself. $40.00 → $1.70.
 */
export function processingFeeCents(amountCents: number): number {
  const fee = Math.round((amountCents * PROCESSING_FEE_BPS) / 10_000) + PROCESSING_FEE_FIXED_CENTS;
  return Math.min(fee, amountCents);
}

/** What the tech receives from a deposit after the processing fee. */
export function techPayoutCents(amountCents: number): number {
  return amountCents - processingFeeCents(amountCents);
}

/**
 * Parses what a tech types into a price box ("45", "45.5", "$1,200.00") into cents,
 * without floating-point math. Returns null if it isn't a valid amount.
 */
export function dollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "");
  const match = /^(\d{1,7})(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

/** Cents as a plain dollar string for a form input ("45.50"). */
export function centsToDollarsInput(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
