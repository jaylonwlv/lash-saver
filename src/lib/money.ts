import { DEFAULT_CURRENCY } from "@/lib/config";

/** All money is stored and passed around as integer cents. Format only at the edge. */
export function formatCents(cents: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/** Platform fee for a charge, rounded down so the tech never pays a fraction of a cent extra. */
export function platformFeeCents(amountCents: number, feeBps: number): number {
  return Math.floor((amountCents * feeBps) / 10_000);
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
