import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalLinks } from "@/components/ui/legal-links";
import { bookingStatusLabel, eventTypeLabel, holdStillOpen } from "@/lib/catering/bookings";
import { formatEventDate } from "@/lib/catering/dates";
import { refundTermsText } from "@/lib/catering/agreement";
import { bookingWhen, hostCancelQuote, quotePageUrl, readQuote } from "@/lib/catering/server";
import { formatCents } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelEvent, finishDeposit, payBalance } from "./actions";
import { AutoRefresh } from "./auto-refresh";
import { PayButton } from "./pay-button";
import { CancelEvent } from "./cancel-event";

export const metadata: Metadata = { title: "Your event", robots: { index: false, follow: false } };

/** The host's booking page. The unguessable token in the URL is what grants access. */
export default async function BookingStatusPage({ params, searchParams }: PageProps<"/e/[token]">) {
  const { token } = await params;
  const { paid, cancelled } = await searchParams;
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) notFound();
  const admin = createAdminClient();
  const { data: b } = await admin
    .from("catering_bookings")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (!b) notFound();
  const { data: owner } = await admin
    .from("profiles")
    .select("business_name, slug, email, phone, instagram_handle")
    .eq("id", b.tech_id)
    .single();
  const { data: payments } = await admin
    .from("catering_payments")
    .select("kind, amount_cents, status, paid_at")
    .eq("booking_id", b.id)
    .in("status", ["paid", "refunded"])
    .order("created_at");

  const business = owner?.business_name ?? "Your caterer";
  const q = readQuote(b);
  const refundedCents = (payments ?? [])
    .filter((p) => p.status === "refunded")
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const paidCents = (payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount_cents, 0);
  const held = ["confirmed", "balance_due", "paid_in_full", "completed"].includes(b.status);
  const holdOpen = holdStillOpen(b);
  const balanceOpen =
    (b.status === "confirmed" || b.status === "balance_due") &&
    b.balance_cents > 0 &&
    !b.balance_paid_at;
  const justPaid = paid === "1";
  const cancelPlan = await hostCancelQuote(b);

  const title = held
    ? b.status === "paid_in_full"
      ? "You're paid in full"
      : "Your date is held"
    : b.status === "awaiting_deposit"
      ? justPaid
        ? "Confirming your payment…"
        : "Your date isn't held yet"
      : b.status === "cancelled"
        ? "This event was cancelled"
        : "This booking wasn't completed";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-1">
        <p className="text-brand text-sm font-semibold">{business}</p>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted">{bookingWhen(b)}</p>
      </div>

      {b.status === "awaiting_deposit" && justPaid && <AutoRefresh />}
      {b.status === "awaiting_deposit" && justPaid && (
        <p className="bg-brand/10 rounded-2xl p-4 text-sm">
          Thanks! We&apos;re confirming your payment with the bank. This page updates in a moment,
          and your confirmation email is on its way.
        </p>
      )}
      {b.status === "awaiting_deposit" && !justPaid && holdOpen && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            We&apos;re holding this date for a few minutes. Pay the deposit to keep it.
          </p>
          <PayButton
            action={finishDeposit.bind(null, token)}
            label={`Pay ${formatCents(b.deposit_cents)} deposit`}
          />
        </div>
      )}
      {(b.status === "expired" || (b.status === "awaiting_deposit" && !holdOpen && !justPaid)) && (
        <p className="text-sm">
          The hold on this date ran out before payment.{" "}
          <a href={quotePageUrl(owner?.slug ?? null)} className="text-brand underline">
            Start again
          </a>{" "}
          to check the date.
        </p>
      )}
      {cancelled === "1" && (
        <p className="bg-brand/10 rounded-2xl p-4 text-sm">
          Your event is cancelled. We emailed you the details.
        </p>
      )}
      {b.status === "cancelled" && (
        <p className="text-sm">
          {b.cancelled_by === "host" ? "You cancelled this event. " : ""}
          {b.cancel_reason ? `Note from ${business}: "${b.cancel_reason}". ` : ""}
          {refundedCents > 0
            ? `${formatCents(refundedCents)} was refunded to your card (5 to 10 business days).`
            : "Nothing was refunded."}
        </p>
      )}

      {balanceOpen && (
        <section className="border-brand flex flex-col gap-3 rounded-2xl border-2 p-4">
          <p className="font-semibold">
            Balance: {formatCents(b.balance_cents)}
            {b.balance_due_date ? `, due ${formatEventDate(b.balance_due_date)}` : ""}
          </p>
          <PayButton
            action={payBalance.bind(null, token)}
            label={`Pay ${formatCents(b.balance_cents)} balance`}
          />
        </section>
      )}

      <section className="border-line bg-surface flex flex-col gap-2 rounded-2xl border p-4 text-sm">
        <p className="flex justify-between gap-3">
          <span className="text-muted">Status</span>
          <span className="font-medium">{bookingStatusLabel(b.status)}</span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-muted">Event</span>
          <span>
            {eventTypeLabel(b.event_type)}, {b.guest_count} guests
          </span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-muted">Where</span>
          <span className="text-right">{b.event_address}</span>
        </p>
        {q && (
          <ul className="border-line mt-2 flex flex-col gap-1 border-t pt-2">
            {q.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-muted">{l.label}</span>
                <span>{formatCents(l.cents)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="border-line flex justify-between border-t pt-2 font-bold">
          <span>Total</span>
          <span>{formatCents(b.total_cents)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-muted">Paid</span>
          <span>{formatCents(paidCents)}</span>
        </p>
        {held && b.status !== "paid_in_full" && b.balance_cents > 0 && (
          <p className="flex justify-between">
            <span className="text-muted">Balance</span>
            <span>{formatCents(b.balance_cents)}</span>
          </p>
        )}
      </section>

      {held && (
        <a href={`/e/${token}/calendar`} className="text-brand text-sm font-medium">
          📅 Add to my calendar
        </a>
      )}

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="font-semibold">Your agreement</h2>
        <p className="text-muted">
          {refundTermsText(
            { host_can_cancel: b.host_can_cancel, full_refund_days: b.full_refund_days },
            business,
          )}
        </p>
        {b.contract_text ? (
          <a href={`/e/${token}/agreement`} className="text-brand font-medium">
            View your signed agreement →
          </a>
        ) : (
          b.policy_text_snapshot && (
            <p className="text-muted whitespace-pre-line">{b.policy_text_snapshot}</p>
          )
        )}
        {cancelPlan && (
          <CancelEvent
            action={cancelEvent.bind(null, token, cancelPlan.refundCents)}
            summary={
              cancelPlan.keptCents === 0
                ? `You'll get ${formatCents(cancelPlan.refundCents)} back, everything you paid. The date opens up for others.`
                : `${business} keeps the ${formatCents(cancelPlan.keptCents)} deposit, as your agreement says.${cancelPlan.refundCents > 0 ? ` You'll get ${formatCents(cancelPlan.refundCents)} back.` : ""}`
            }
          />
        )}
      </section>

      <section className="flex flex-col gap-1 text-sm">
        <h2 className="font-semibold">Contact {business}</h2>
        {owner?.email && (
          <a href={`mailto:${owner.email}`} className="text-brand">
            {owner.email}
          </a>
        )}
        {owner?.phone && (
          <a href={`tel:${owner.phone}`} className="text-brand">
            {owner.phone}
          </a>
        )}
        {owner?.instagram_handle && (
          <a href={`https://ig.me/m/${owner.instagram_handle}`} className="text-brand">
            @{owner.instagram_handle} on Instagram
          </a>
        )}
        <p className="text-muted">To change your event, contact {business} directly.</p>
      </section>
      <LegalLinks />
    </main>
  );
}
