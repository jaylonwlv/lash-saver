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
