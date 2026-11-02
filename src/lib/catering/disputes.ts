import "server-only";
import type Stripe from "stripe";
import { APP_NAME, OWNER_ALERT_EMAIL } from "@/lib/config";
import { formatCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundTermsText } from "./agreement";
import { bookingAdminUrl, bookingWhen, signedAgreement } from "./server";

/*
 * Chargebacks on catering payments. Like deposits (lib/stripe/disputes.ts, which
 * calls these and does the money moves), the bank takes the disputed amount from
 * the platform, and the owner's transfer is reversed until the dispute is won.
 * Here: recognize catering payments, submit the signed agreement as evidence,
 * record the outcome and tell the owner.
 */

const idOf = (v: string | { id: string } | null | undefined) =>
  typeof v === "string" ? v : (v?.id ?? null);

export async function findCateringPayment(dispute: Stripe.Dispute) {
  const pi = idOf(dispute.payment_intent);
  if (!pi) return null;
  const { data } = await createAdminClient()
    .from("catering_payments")
    .select("id, booking_id, kind, amount_cents, dispute_status")
    .eq("stripe_payment_intent_id", pi)
    .maybeSingle();
  return data;
}

async function loadBooking(bookingId: string) {
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("catering_bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (!booking) return null;
  const { data: owner } = await admin
    .from("profiles")
    .select("business_name, email")
    .eq("id", booking.tech_id)
    .single();
  return owner ? { booking, owner } : null;
}

const disputeUrl = (dispute: Stripe.Dispute) =>
  `https://dashboard.stripe.com/${dispute.livemode ? "" : "test/"}disputes/${dispute.id}`;
const dueBy = (dispute: Stripe.Dispute) =>
  dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000).toUTCString().replace(":00 GMT", " UTC")
    : "the date shown in Stripe";

/** True if this was a catering payment (handled here); false to let the caller go on. */
export async function handleCateringDisputeCreated(dispute: Stripe.Dispute): Promise<boolean> {
  const payment = await findCateringPayment(dispute);
  if (!payment) return false;
  const admin = createAdminClient();
  // Claim it once; a webhook retry finds it recorded.
  const { data: claimed } = await admin
    .from("catering_payments")
    .update({ dispute_id: dispute.id, dispute_status: "open" })
    .eq("id", payment.id)
    .is("dispute_id", null)
    .select("id");
  if (!claimed?.length) return true;
  const loaded = await loadBooking(payment.booking_id);
  if (!loaded) return true;
  const { booking: b, owner } = loaded;
  const business = owner.business_name ?? "the caterer";
  const amount = formatCents(payment.amount_cents);
  const agreement = signedAgreement(b);
  const terms = refundTermsText(
    { host_can_cancel: b.host_can_cancel, full_refund_days: b.full_refund_days },
    business,
  );
  const signed =
    b.signature_name && b.signed_at
      ? `The customer signed the catering agreement electronically by typing their name ("${b.signature_name}") on ${new Date(b.signed_at).toUTCString()}${b.signer_ip ? ` from IP address ${b.signer_ip}` : ""}, before paying.`
      : `The customer agreed to the caterer's policy on the payment page before paying.`;
  const outcome =
    b.status === "completed"
      ? "The event took place and the catering was provided."
      : b.status === "cancelled" && b.cancelled_by === "host"
        ? "The customer cancelled. Refunds were made automatically under the cancellation terms they signed; the disputed payment was not refundable under those terms."
        : `Booking status: ${b.status}.`;

  let submitted = false;
  if (dispute.status === "needs_response" || dispute.status === "warning_needs_response") {
    try {
      await getStripe().disputes.update(dispute.id, {
        evidence: {
          customer_name: b.host_name,
          customer_email_address: b.host_email,
          ...(b.signer_ip ? { customer_purchase_ip: b.signer_ip } : {}),
          product_description: `${amount} ${payment.kind === "deposit" ? "deposit to book" : "balance for"} catering by ${business} for ${b.guest_count} guests on ${bookingWhen(b)} at ${b.event_address}, paid through ${APP_NAME}.`,
          service_date: b.event_date,
          cancellation_policy_disclosure: `${signed} Cancellation terms: ${terms}`,
          refund_policy_disclosure: `${signed} Refund terms: ${terms}`,
          cancellation_rebuttal: outcome,
          refund_refusal_explanation: outcome,
          uncategorized_text:
            `${signed}\n\n${outcome}\n\nThe customer received a booking confirmation by email with the signed agreement attached.\n\n${agreement ?? b.policy_text_snapshot ?? ""}`.slice(
              0,
              19_000,
            ),
        },
        metadata: { catering_payment_id: payment.id, catering_booking_id: b.id },
        submit: true,
      });
      submitted = true;
    } catch (err) {
      console.error("Submitting catering dispute evidence failed", err);
    }
  }

  await notify({
    to: { email: owner.email },
    template: "catering_payment_disputed",
    data: {
      hostName: b.host_name,
      amount,
      when: bookingWhen(b),
      bookingUrl: bookingAdminUrl(b.id),
    },
  });
  await notify({
    to: { email: OWNER_ALERT_EMAIL },
    template: "dispute_alert",
    data: {
      summary: `${b.host_name} disputed a ${amount} catering ${payment.kind} with ${business} (${dispute.reason}, event ${b.event_date}).${submitted ? "" : " Evidence was NOT submitted: add it in Stripe."}`,
      amount,
      dueBy: dueBy(dispute),
      disputeUrl: disputeUrl(dispute),
    },
  });
  return true;
}

/** True if this was a catering payment. Records the outcome once and tells the owner. */
export async function handleCateringDisputeClosed(dispute: Stripe.Dispute): Promise<boolean> {
  const payment = await findCateringPayment(dispute);
  if (!payment) return false;
  if (payment.dispute_status === "won" || payment.dispute_status === "lost") return true;
  const won = dispute.status === "won" || dispute.status === "warning_closed";
  const update = createAdminClient()
    .from("catering_payments")
    .update({ dispute_id: dispute.id, dispute_status: won ? "won" : "lost" })
    .eq("id", payment.id);
  const { data: updated } = await (
    payment.dispute_status === "open"
      ? update.eq("dispute_status", "open")
      : update.is("dispute_status", null)
  ).select("id");
  if (!updated?.length || dispute.status === "warning_closed") return true;
  const loaded = await loadBooking(payment.booking_id);
  if (!loaded) return true;
  await notify({
    to: { email: loaded.owner.email },
    template: "catering_dispute_closed",
    data: {
      hostName: loaded.booking.host_name,
      amount: formatCents(payment.amount_cents),
      won,
      bookingUrl: bookingAdminUrl(loaded.booking.id),
    },
  });
  return true;
}
