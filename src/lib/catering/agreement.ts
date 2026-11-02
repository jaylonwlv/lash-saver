/*
 * The catering agreement the host e-signs: built from the booking's details and
 * the owner's terms, identical on the page (preview) and the server (the stored
 * record). Plain text so it prints, emails and stores as-is. No server deps.
 */
import { APP_NAME } from "@/lib/config";
import { formatCents } from "@/lib/money";
import { formatClock, formatEventDate } from "./dates";
import type { LineItem } from "./quote";

export type RefundTerms = { host_can_cancel: boolean; full_refund_days: number | null };

/** One sentence per case, shared by the agreement, the page and emails. */
export function refundTermsText(t: RefundTerms, businessName: string): string {
  const days = t.full_refund_days ?? 0;
  const owner = `If ${businessName} cancels, everything you paid is refunded in full.`;
  if (!t.host_can_cancel)
    return `To cancel, contact ${businessName}; refunds are at their discretion. ${owner}`;
  if (days === 0)
    return `You can cancel online up to the day of the event for a full refund. ${owner}`;
  return `You can cancel online. At least ${days} day${days === 1 ? "" : "s"} before the event, everything you paid is refunded. After that, the deposit is kept and any balance you paid is refunded. ${owner}`;
}

export type AgreementInput = {
  businessName: string;
  hostName: string;
  hostEmail: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  eventAddress: string;
  guestCount: number;
  lines: LineItem[];
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  balanceDueDate: string | null;
  refund: RefundTerms;
  policyText: string | null;
  contractTerms: string | null;
};

export function buildAgreement(a: AgreementInput): string {
  const payment =
    a.balanceCents === 0
      ? `The full ${formatCents(a.totalCents)} is paid at booking.`
      : `A ${formatCents(a.depositCents)} deposit is paid at booking to hold the date. The ${formatCents(a.balanceCents)} balance is due${a.balanceDueDate ? ` by ${formatEventDate(a.balanceDueDate)}` : " before the event"}.`;
  const sections = [
    `CATERING AGREEMENT`,
    `Between ${a.businessName} ("the caterer") and ${a.hostName} (${a.hostEmail}) ("the host").`,
    `EVENT\n${formatEventDate(a.eventDate)}, ${formatClock(a.startTime)} to ${formatClock(a.endTime)}\n${a.eventAddress}\n${a.guestCount} guests`,
    `PRICE\n${a.lines.map((l) => `${l.label}: ${formatCents(l.cents)}`).join("\n")}\nTotal: ${formatCents(a.totalCents)}`,
    `PAYMENT\n${payment} Payments are made by card through ${APP_NAME} and Stripe.`,
    `CANCELLATION AND REFUNDS\n${refundTermsText(a.refund, a.businessName)}`,
    ...(a.policyText ? [`POLICY\n${a.policyText}`] : []),
    ...(a.contractTerms ? [`ADDITIONAL TERMS\n${a.contractTerms}`] : []),
    `ELECTRONIC SIGNATURE\nThe host agrees to use electronic records and signatures for this agreement, and that typing their name below is their signature. A copy stays on the host's booking page; to ask for a paper copy, contact the caterer.`,
  ];
  return sections.join("\n\n");
}

/** The signature block appended to a signed agreement. */
export function signatureBlock(s: {
  signatureName: string;
  signedAt: string;
  ip: string | null;
}): string {
  return `SIGNED\n${s.signatureName}\n${new Date(s.signedAt).toUTCString()}${s.ip ? `\nIP address: ${s.ip}` : ""}`;
}

/** Signature must be the host's name (case and spacing aside). */
export function signatureMatches(signature: string, hostName: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(signature).length >= 2 && norm(signature) === norm(hostName);
}
