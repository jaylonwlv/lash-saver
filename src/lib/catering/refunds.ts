/*
 * Which payments a cancellation refunds (pure, testable). Refunds are always of
 * whole payments: a deposit is either refunded or kept, a balance is refunded.
 */
import { daysBetween } from "./dates";

export type PaidPayment = { id: string; kind: "deposit" | "balance"; amount_cents: number };

export type RefundPlan = {
  refund: PaidPayment[];
  keep: PaidPayment[];
  refundCents: number;
  keptCents: number;
};

function plan(payments: PaidPayment[], keepDeposit: boolean): RefundPlan {
  const keep = keepDeposit ? payments.filter((p) => p.kind === "deposit") : [];
  const refund = payments.filter((p) => !keep.includes(p));
  const sum = (ps: PaidPayment[]) => ps.reduce((s, p) => s + p.amount_cents, 0);
  return { refund, keep, refundCents: sum(refund), keptCents: sum(keep) };
}

/** The owner cancels: the host gets everything back. */
export function ownerCancelPlan(payments: PaidPayment[]): RefundPlan {
  return plan(payments, false);
}

/**
 * The host cancels on `today` (owner's date). Null when they can't cancel online
 * (owner turned it off, or the event day has passed).
 */
export function hostCancelPlan(
  terms: { host_can_cancel: boolean; full_refund_days: number | null; event_date: string },
  payments: PaidPayment[],
  today: string,
): RefundPlan | null {
  if (!terms.host_can_cancel) return null;
  const daysLeft = daysBetween(today, terms.event_date);
  if (daysLeft < 0) return null;
  const fullRefund = daysLeft >= (terms.full_refund_days ?? 0);
  return plan(payments, !fullRefund);
}
