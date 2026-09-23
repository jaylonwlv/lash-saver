/*
 * How a pro collects deposits. "stripe": automatic card / Apple Pay payments
 * through Dibs. "manual": the client sends it with the pro's own Cash App,
 * Zelle or Venmo, and the pro confirms receipt and sends any refunds.
 * No server dependencies, so pages and emails can use it.
 */
import type { ManualApp, Tables } from "@/lib/supabase/database.types";

export type DepositSetup = Pick<
  Tables<"profiles">,
  "deposit_method" | "stripe_charges_enabled" | "cashapp_tag" | "zelle_contact" | "venmo_handle"
>;

export type ManualHandle = { app: ManualApp; label: string; handle: string };

export const MANUAL_APP_LABEL: Record<ManualApp, string> = {
  cashapp: "Cash App",
  zelle: "Zelle",
  venmo: "Venmo",
};

/** The pro's payment handles, in the order clients should see them. */
export function manualHandles(p: DepositSetup): ManualHandle[] {
  const handles: ManualHandle[] = [];
  if (p.cashapp_tag) handles.push({ app: "cashapp", label: "Cash App", handle: p.cashapp_tag });
  if (p.zelle_contact) handles.push({ app: "zelle", label: "Zelle", handle: p.zelle_contact });
  if (p.venmo_handle) handles.push({ app: "venmo", label: "Venmo", handle: `@${p.venmo_handle}` });
  return handles;
}

/** Whether the pro can take deposits with their chosen method right now. */
export function canTakeDeposits(p: DepositSetup): boolean {
  return p.deposit_method === "manual" ? manualHandles(p).length > 0 : p.stripe_charges_enabled;
}

/**
 * Link that opens the payment app with the amount filled in, where the app
 * supports it. Zelle has no public link format; clients copy the email/phone.
 */
export function paymentAppUrl(
  handle: ManualHandle,
  amountCents: number,
  note: string,
): string | null {
  const amount = (amountCents / 100).toFixed(2);
  if (handle.app === "cashapp") {
    // Cash App's format is cash.app/$tag/40; "40.00" can drop you on the home screen.
    const cashAmount = amountCents % 100 === 0 ? String(amountCents / 100) : amount;
    return `https://cash.app/${handle.handle}/${cashAmount}`;
  }
  if (handle.app === "venmo") {
    // Venmo shows "+" literally, so encode spaces as %20 (URLSearchParams uses "+").
    const user = encodeURIComponent(handle.handle.replace(/^@/, ""));
    return `https://venmo.com/${user}?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`;
  }
  return null;
}
