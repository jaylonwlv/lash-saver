import "server-only";
import type Stripe from "stripe";
import {
  appointmentUrl,
  loadAppointmentContext,
  type AppointmentContext,
} from "@/lib/appointments";
import { APP_NAME, OWNER_ALERT_EMAIL } from "@/lib/config";
import { formatCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { notifyForAppointment } from "@/lib/notifications/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatWhen } from "@/lib/time";
import { getStripe } from "./server";

/*
 * Card disputes (chargebacks) on deposits. Deposits are destination charges, so
 * Stripe takes a disputed amount from the platform's balance, not the pro's.
 * These handlers move the loss back to the pro, as the Terms say:
 *
 *   created           record it, send the bank the agreed policy, email pro + owner
 *   funds_withdrawn   reverse the transfer to the pro (skipped for inquiries,
 *                     where no money moves unless it escalates)
 *   funds_reinstated  dispute won: transfer the money back to the pro
 *   closed            record the outcome and tell the pro
 *
 * Each step is idempotent: Stripe retries webhooks, sometimes days later.
 */

const idOf = (v: string | { id: string } | null | undefined) =>
  typeof v === "string" ? v : (v?.id ?? null);

async function findDeposit(dispute: Stripe.Dispute) {
  const pi = idOf(dispute.payment_intent);
  if (!pi) return null;
  const { data } = await createAdminClient()
    .from("deposits")
    .select("id, appointment_id, amount_cents, currency, status, dispute_status")
    .eq("stripe_payment_intent_id", pi)
    .eq("method", "stripe")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** The transfer that sent this charge's money to the pro. */
async function transferFor(dispute: Stripe.Dispute): Promise<Stripe.Transfer | null> {
  const chargeId = idOf(dispute.charge);
  if (!chargeId) return null;
  const charge = await getStripe().charges.retrieve(chargeId);
  const transferId = idOf(charge.transfer);
  return transferId ? getStripe().transfers.retrieve(transferId) : null;
}

const dueBy = (dispute: Stripe.Dispute) =>
  dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000).toUTCString().replace(":00 GMT", " UTC")
    : "the date shown in Stripe";

const disputeUrl = (dispute: Stripe.Dispute) =>
  `https://dashboard.stripe.com/${dispute.livemode ? "" : "test/"}disputes/${dispute.id}`;

/** What we tell the bank: the policy the client agreed to, when, and what happened. */
function evidence(
  ctx: AppointmentContext,
  amountCents: number,
): Stripe.DisputeUpdateParams.Evidence {
  const { appointment: a, tech, serviceName } = ctx;
  const business = tech.business_name ?? "the provider";
  const when = formatWhen(a.starts_at, tech.timezone);
  const policy = a.policy_text_snapshot ?? "(policy text not recorded)";
  const agreed = a.policy_accepted_at
    ? `The client agreed to this policy on ${formatWhen(a.policy_accepted_at, tech.timezone)} by ticking "I agree" on the payment page before paying: "${policy}"`
    : `The payment page showed this policy before payment: "${policy}"`;
  const outcome =
    a.status === "no_show"
      ? "The client did not attend the appointment. Under the policy they agreed to, a no-show forfeits the deposit."
      : a.status === "cancelled_by_client"
        ? "The client cancelled after the refund deadline in the policy they agreed to, so the deposit was not refundable. Before cancelling, the page told them the deposit would not be refunded."
        : a.status === "completed"
          ? "The service was provided and the deposit was applied to its price."
          : `Appointment status: ${a.status}.`;

  return {
    customer_name: a.client_name,
    ...(a.client_email ? { customer_email_address: a.client_email } : {}),
    product_description: `${formatCents(amountCents)} deposit to reserve an appointment (${serviceName}) with ${business} on ${when}, paid through ${APP_NAME}.`,
    service_date: a.starts_at.slice(0, 10),
    cancellation_policy_disclosure: agreed,
    refund_policy_disclosure: agreed,
    cancellation_rebuttal: outcome,
    refund_refusal_explanation: outcome,
    uncategorized_text: `${agreed}\n\n${outcome}\n\nThe client also received a booking confirmation and appointment reminders by email, each stating the cancellation deadline.`,
  };
}

export async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  const deposit = await findDeposit(dispute);
  const amount = formatCents(dispute.amount);

  if (!deposit) {
    // Not a deposit (for example a subscription payment): just tell the owner.
    await notify({
      to: { email: OWNER_ALERT_EMAIL },
      template: "dispute_alert",
      data: {
        summary: `A ${amount} payment to ${APP_NAME} (not a deposit) was disputed (${dispute.reason}).`,
        amount,
        dueBy: dueBy(dispute),
        disputeUrl: disputeUrl(dispute),
      },
    });
    return;
  }

  // Claim the dispute once; a retry finds it already recorded.
  const { data: claimed } = await createAdminClient()
    .from("deposits")
    .update({ dispute_id: dispute.id, dispute_status: "open" })
    .eq("id", deposit.id)
    .is("dispute_id", null)
    .select("id");
  if (!claimed?.length) return;

  const ctx = await loadAppointmentContext(deposit.appointment_id);
  if (!ctx) return;

  let submitted = false;
  if (dispute.status === "needs_response" || dispute.status === "warning_needs_response") {
    try {
      await getStripe().disputes.update(dispute.id, {
        evidence: evidence(ctx, deposit.amount_cents),
        metadata: { deposit_id: deposit.id, appointment_id: deposit.appointment_id },
        submit: true,
      });
      submitted = true;
    } catch (err) {
      console.error("Submitting dispute evidence failed", err);
    }
  }

  const { appointment: a, tech } = ctx;
  const when = formatWhen(a.starts_at, tech.timezone);
  await notifyForAppointment({
    appointmentId: a.id,
    to: { email: tech.email },
    template: "deposit_disputed",
    data: {
      clientName: a.client_name,
      amount: formatCents(deposit.amount_cents),
      when,
      appointmentUrl: appointmentUrl(a.id),
    },
  });
  await notify({
    to: { email: OWNER_ALERT_EMAIL },
    template: "dispute_alert",
    data: {
      summary: `${a.client_name} disputed a ${amount} deposit with ${tech.business_name ?? tech.email} (${dispute.reason}, appointment ${when}).${submitted ? "" : " Evidence was NOT submitted: add it in Stripe."}`,
      amount,
      dueBy: dueBy(dispute),
      disputeUrl: disputeUrl(dispute),
    },
  });
}

/** The bank took the money: take the pro's share back from their Stripe account. */
export async function handleDisputeFundsWithdrawn(dispute: Stripe.Dispute): Promise<void> {
  if (!(await findDeposit(dispute))) return;
  const transfer = await transferFor(dispute);
  if (!transfer) return;

  const stripe = getStripe();
  const reversals = await stripe.transfers.listReversals(transfer.id, { limit: 100 });
  if (reversals.data.some((r) => r.metadata?.dispute_id === dispute.id)) return;

  const amount = Math.min(dispute.amount, transfer.amount - transfer.amount_reversed);
  if (amount <= 0) return; // Already refunded, nothing left to pull back.
  await stripe.transfers.createReversal(
    transfer.id,
    { amount, metadata: { dispute_id: dispute.id } },
    { idempotencyKey: `dispute-reversal-${dispute.id}` },
  );
}

/** The dispute was won and the money is back with us: return the pro's share. */
export async function handleDisputeFundsReinstated(dispute: Stripe.Dispute): Promise<void> {
  if (!(await findDeposit(dispute))) return;
  const transfer = await transferFor(dispute);
  if (!transfer) return;
  const destination = idOf(transfer.destination);
  if (!destination) return;

  const stripe = getStripe();
  const reversals = await stripe.transfers.listReversals(transfer.id, { limit: 100 });
  const reversed = reversals.data
    .filter((r) => r.metadata?.dispute_id === dispute.id)
    .reduce((sum, r) => sum + r.amount, 0);
  if (reversed <= 0) return;

  const group = `dispute_${dispute.id}`;
  const existing = await stripe.transfers.list({ transfer_group: group, limit: 1 });
  if (existing.data.length) return;
  await stripe.transfers.create(
    {
      amount: reversed,
      currency: transfer.currency,
      destination,
      transfer_group: group,
      description: "Deposit returned: dispute won",
      metadata: { dispute_id: dispute.id },
    },
    { idempotencyKey: `dispute-return-${dispute.id}` },
  );
}

export async function handleDisputeClosed(dispute: Stripe.Dispute): Promise<void> {
  const deposit = await findDeposit(dispute);
  if (!deposit) return;
  // "warning_closed" is an inquiry that never became a chargeback: no money moved.
  const won = dispute.status === "won" || dispute.status === "warning_closed";

  if (deposit.dispute_status === "won" || deposit.dispute_status === "lost") return;
  // Only the first "closed" event records the outcome (and emails the pro).
  const update = createAdminClient()
    .from("deposits")
    .update({ dispute_id: dispute.id, dispute_status: won ? "won" : "lost" })
    .eq("id", deposit.id);
  const { data: updated } = await (
    deposit.dispute_status === "open"
      ? update.eq("dispute_status", "open")
      : update.is("dispute_status", null)
  ).select("id");
  if (!updated?.length || dispute.status === "warning_closed") return;

  const ctx = await loadAppointmentContext(deposit.appointment_id);
  if (!ctx) return;
  await notifyForAppointment({
    appointmentId: ctx.appointment.id,
    to: { email: ctx.tech.email },
    template: "deposit_dispute_closed",
    data: {
      clientName: ctx.appointment.client_name,
      amount: formatCents(deposit.amount_cents),
      won,
      appointmentUrl: appointmentUrl(ctx.appointment.id),
    },
  });
}
