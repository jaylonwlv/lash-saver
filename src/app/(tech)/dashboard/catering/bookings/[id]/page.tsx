import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import {
  ACTIVE_STATUSES,
  bookingStatusLabel,
  eventTypeLabel,
  HELD_STATUSES,
} from "@/lib/catering/bookings";
import { formatEventDate } from "@/lib/catering/dates";
import { bookingWhen, readQuote } from "@/lib/catering/server";
import { formatCents, techPayoutCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import {
  cancelBooking,
  markCompleted,
  refundPayment,
  resendConfirmation,
  saveNotes,
} from "../actions";

export const metadata: Metadata = { title: "Catering booking" };

export default async function CateringBookingPage({
  params,
  searchParams,
}: PageProps<"/dashboard/catering/bookings/[id]">) {
  const { id } = await params;
  const flags = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("catering_bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!b) notFound();
  const { data: payments } = await supabase
    .from("catering_payments")
    .select("id, kind, amount_cents, status, paid_at")
    .eq("booking_id", b.id)
    .in("status", ["paid", "refunded"])
    .order("created_at");
  const q = readQuote(b);
  const paidCents = (payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const held = (HELD_STATUSES as readonly string[]).includes(b.status);
  const active = (ACTIVE_STATUSES as readonly string[]).includes(b.status);
  const row = "flex justify-between gap-3";

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/catering/bookings" label="Bookings" />
      <div className="flex flex-col gap-1">
        <p className="text-muted text-sm font-medium">{bookingStatusLabel(b.status)}</p>
        <h1 className="font-display text-2xl font-bold">{b.host_name}</h1>
        <p className="text-muted">{bookingWhen(b)}</p>
        {b.status === "cancelled" && b.cancelled_by && (
          <p className="text-muted text-sm">
            Cancelled by {b.cancelled_by === "host" ? "the host" : "you"}
            {b.cancel_reason ? `: "${b.cancel_reason}"` : ""}
          </p>
        )}
      </div>

      {flags.saved === "1" && <p className="bg-brand-soft rounded-2xl p-4 text-sm">Notes saved.</p>}
      {flags.resent === "1" && (
        <p className="bg-brand-soft rounded-2xl p-4 text-sm">
          Confirmation sent to {b.host_email}.
        </p>
      )}
      {flags.refunded === "1" && (
        <p className="bg-brand-soft rounded-2xl p-4 text-sm">
          Refunded. It reaches the host in 5 to 10 business days.
        </p>
      )}
      {flags.cancelled === "1" && (
        <p className="bg-brand-soft rounded-2xl p-4 text-sm">
          Cancelled. We emailed {b.host_name}.
        </p>
      )}

      <section className="border-line bg-surface flex flex-col gap-2 rounded-2xl border p-4 text-sm">
        <p className={row}>
          <span className="text-muted">Event</span>
          <span>
            {eventTypeLabel(b.event_type)}, {b.guest_count} guests
          </span>
        </p>
        <p className={row}>
          <span className="text-muted">Package</span>
          <span className="text-right">
            {q?.packageName ?? "—"}
            {q?.addOnNames.length ? ` + ${q.addOnNames.join(", ")}` : ""}
          </span>
        </p>
        <p className={row}>
          <span className="text-muted">Where</span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.event_address)}`}
            target="_blank"
            rel="noreferrer"
            className="text-brand text-right"
          >
            {b.event_address}
          </a>
        </p>
        {b.event_notes && (
          <p className={row}>
            <span className="text-muted">Notes</span>
            <span className="text-right whitespace-pre-line">{b.event_notes}</span>
          </p>
        )}
        <p className={row}>
          <span className="text-muted">Email</span>
          <a href={`mailto:${b.host_email}`} className="text-brand">
            {b.host_email}
          </a>
        </p>
        {b.host_phone && (
          <p className={row}>
            <span className="text-muted">Phone</span>
            <a href={`tel:${b.host_phone}`} className="text-brand">
              {b.host_phone}
            </a>
          </p>
        )}
      </section>

      <section className="border-line bg-surface flex flex-col gap-2 rounded-2xl border p-4 text-sm">
        <h2 className="font-semibold">Price</h2>
        {q?.lines.map((l, i) => (
          <p key={i} className={row}>
            <span className="text-muted">{l.label}</span>
            <span>{formatCents(l.cents)}</span>
          </p>
        ))}
        <p className={`${row} border-line border-t pt-2 font-bold`}>
          <span>Total</span>
          <span>{formatCents(b.total_cents)}</span>
        </p>
        {b.balance_cents > 0 && b.status !== "paid_in_full" && held && (
          <p className={row}>
            <span className="text-muted">
              Balance{b.balance_due_date ? ` due ${formatEventDate(b.balance_due_date)}` : ""}
            </span>
            <span>{formatCents(b.balance_cents)}</span>
          </p>
        )}
      </section>

      <section className="border-line bg-surface flex flex-col gap-2 rounded-2xl border p-4 text-sm">
        <h2 className="font-semibold">Agreement</h2>
        {b.signature_name && b.signed_at ? (
          <p className="text-muted">
            Signed by <span className="text-foreground font-serif italic">{b.signature_name}</span>{" "}
            on{" "}
            {new Date(b.signed_at).toLocaleString("en-US", {
              timeZone: b.timezone,
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        ) : (
          <p className="text-muted">Agreed to your policy (booked before e-signing).</p>
        )}
        <p className="text-muted">
          {!b.host_can_cancel
            ? "The host can't cancel online; they contact you."
            : b.full_refund_days
              ? `The host can cancel online: full refund at least ${b.full_refund_days} days before; after that you keep the deposit.`
              : "The host can cancel online for a full refund until the event."}
        </p>
        {b.contract_text && (
          <a
            href={`/e/${b.public_token}/agreement`}
            target="_blank"
            rel="noreferrer"
            className="text-brand font-medium"
          >
            View the signed agreement →
          </a>
        )}
      </section>

      {(payments ?? []).length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Payments</h2>
          {payments!.map((p) => (
            <div
              key={p.id}
              className="border-line bg-surface flex flex-col gap-2 rounded-2xl border p-4 text-sm"
            >
              <p className={row}>
                <span className="font-medium">
                  {p.kind === "deposit"
                    ? b.balance_cents === 0
                      ? "Paid in full"
                      : "Deposit"
                    : "Balance"}
                </span>
                <span>{formatCents(p.amount_cents)}</span>
              </p>
              <p className="text-muted">
                {p.status === "refunded"
                  ? "Refunded"
                  : `You receive ${formatCents(techPayoutCents(p.amount_cents))} after the processing fee.`}
              </p>
              {/* An active event is refunded by cancelling it, which also frees the date. */}
              {p.status === "paid" && !active && (
                <form action={refundPayment.bind(null, b.id, p.id)}>
                  <button type="submit" className="text-danger min-h-11 text-sm font-medium">
                    Refund {formatCents(p.amount_cents)} to the host
                  </button>
                </form>
              )}
            </div>
          ))}
        </section>
      )}

      <form action={saveNotes.bind(null, b.id)} className="flex flex-col gap-3">
        <Textarea
          id="owner_notes"
          label="Private notes"
          defaultValue={b.owner_notes ?? ""}
          placeholder="Gate code, menu changes…"
        />
        <Button type="submit" variant="secondary">
          Save notes
        </Button>
      </form>

      {held && (
        <div className="flex flex-col gap-3">
          <form action={resendConfirmation.bind(null, b.id)}>
            <Button type="submit" variant="secondary">
              Resend confirmation to host
            </Button>
          </form>
          <form action={markCompleted.bind(null, b.id)}>
            <Button type="submit" variant="secondary">
              Mark as done
            </Button>
          </form>
        </div>
      )}

      {active && (
        <details className="border-line rounded-2xl border p-4">
          <summary className="text-danger min-h-11 cursor-pointer leading-[2.75rem] font-medium">
            Cancel this event
          </summary>
          <form action={cancelBooking.bind(null, b.id)} className="mt-3 flex flex-col gap-3">
            <Textarea
              id="reason"
              label="Note to the host (optional)"
              placeholder="e.g. Our truck is in the shop. So sorry!"
            />
            <p className="text-muted text-sm">
              Everything the host paid
              {paidCents > 0 ? ` (${formatCents(paidCents)})` : ""} is refunded automatically, and
              we email them. The processing fee isn&apos;t returned to you.
            </p>
            <Button type="submit" variant="secondary">
              Cancel event
            </Button>
          </form>
        </details>
      )}
    </div>
  );
}
