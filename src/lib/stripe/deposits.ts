import "server-only";
import type Stripe from "stripe";
import {
  appointmentUrl,
  loadAppointmentContext,
  payability,
  payUrl,
  policySummary,
} from "@/lib/appointments";
import { CHECKOUT_SESSION_MINUTES, DEFAULT_CURRENCY } from "@/lib/config";
import { serverEnv } from "@/lib/env";
import { formatCents, platformFeeCents } from "@/lib/money";
import { notifyForAppointment } from "@/lib/notifications/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatWhen } from "@/lib/time";
import { getStripe } from "./server";

/*
 * Deposits are destination charges: the client pays the platform through
 * Checkout, Stripe transfers the deposit minus our fee to the tech's connected
 * account. Deposit status changes only here, driven by Stripe webhooks or by a
 * refund we just made.
 */

export class PayError extends Error {
  constructor(readonly reason: "closed" | "expired" | "tech_not_ready") {
    super(reason);
  }
}

const SETTLED = ["paid", "applied", "forfeited"] as const;

/**
 * Returns a Stripe Checkout URL for the appointment's deposit. Reuses an open
 * session so double taps don't create two. Records the policy the client agreed to.
 */
export async function createDepositCheckout(appointmentId: string): Promise<string> {
  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx) throw new PayError("closed");
  const { appointment: a, tech, serviceName } = ctx;

  const state = payability(a);
  if (state !== "ok") throw new PayError(state);
  if (!tech.stripe_charges_enabled || !tech.stripe_account_id) throw new PayError("tech_not_ready");
  if (!a.deposit_cents) throw new Error(`Appointment ${a.id} has no deposit amount`);

  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: open } = await admin
    .from("deposits")
    .select("stripe_checkout_session_id")
    .eq("appointment_id", a.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open?.stripe_checkout_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(open.stripe_checkout_session_id);
    if (existing.status === "open" && existing.url) return existing.url;
  }

  const policy = policySummary(tech.cancellation_window_hours, tech.policy_text);
  const { error: acceptError } = await admin
    .from("appointments")
    .update({
      policy_accepted_at: new Date().toISOString(),
      policy_text_snapshot: policy,
      cancellation_window_hours_snapshot: tech.cancellation_window_hours,
    })
    .eq("id", a.id)
    .eq("status", "pending_deposit");
  if (acceptError) throw new Error(`Recording policy acceptance failed: ${acceptError.message}`);

  const fee = platformFeeCents(a.deposit_cents, serverEnv().STRIPE_PLATFORM_FEE_BPS);
  const { data: deposit, error: depositError } = await admin
    .from("deposits")
    .insert({
      appointment_id: a.id,
      tech_id: tech.id,
      amount_cents: a.deposit_cents,
      platform_fee_cents: fee,
      currency: DEFAULT_CURRENCY,
    })
    .select("id")
    .single();
  if (depositError || !deposit)
    throw new Error(`Creating deposit failed: ${depositError?.message}`);

  const businessName = tech.business_name ?? "your lash tech";
  const when = formatWhen(a.starts_at, tech.timezone);
  const metadata = { appointment_id: a.id, deposit_id: deposit.id, tech_id: tech.id };

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: a.client_email ?? undefined,
      client_reference_id: a.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: DEFAULT_CURRENCY,
            unit_amount: a.deposit_cents,
            product_data: {
              name: `Deposit: ${serviceName} with ${businessName}`,
              description: when,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: fee > 0 ? fee : undefined,
        transfer_data: { destination: tech.stripe_account_id },
        description: `Deposit: ${serviceName}, ${when}`,
        metadata,
      },
      custom_text: {
        submit: {
          message: `By paying, you agree to ${businessName}'s deposit policy: ${policy}`.slice(
            0,
            1200,
          ),
        },
      },
      metadata,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_MINUTES * 60,
      success_url: `${payUrl(a.id)}?paid=1`,
      cancel_url: payUrl(a.id),
    },
    { idempotencyKey: `checkout-${deposit.id}` },
  );

  const { error: saveError } = await admin
    .from("deposits")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", deposit.id);
  if (saveError) throw new Error(`Saving checkout session failed: ${saveError.message}`);
  if (!session.url) throw new Error(`Checkout session ${session.id} has no URL`);
  return session.url;
}

/** Refunds a payment in full, pulling it back from the tech and returning our fee. */
async function refundPayment(paymentIntentId: string, depositId: string) {
  await getStripe().refunds.create(
    { payment_intent: paymentIntentId, reverse_transfer: true, refund_application_fee: true },
    { idempotencyKey: `refund-${depositId}` },
  );
}

const paymentIntentId = (pi: string | Stripe.PaymentIntent | null) =>
  typeof pi === "string" ? pi : (pi?.id ?? null);

/** checkout.session.completed: confirm the appointment, or refund if it can't be booked. */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== "paid") return;
  const depositId = session.metadata?.deposit_id;
  const appointmentId = session.metadata?.appointment_id;
  const pi = paymentIntentId(session.payment_intent);
  if (!depositId || !appointmentId || !pi) {
    console.error("checkout.session.completed without deposit metadata", session.id);
    return;
  }

  const admin = createAdminClient();
  const { data: deposit } = await admin
    .from("deposits")
    .select("id, status, amount_cents")
    .eq("id", depositId)
    .maybeSingle();
  if (
    !deposit ||
    deposit.status === "refunded" ||
    (SETTLED as readonly string[]).includes(deposit.status)
  ) {
    return; // Unknown or already handled (webhook retry).
  }

  const ctx = await loadAppointmentContext(appointmentId);
  const { data: otherSettled } = await admin
    .from("deposits")
    .select("id")
    .eq("appointment_id", appointmentId)
    .neq("id", depositId)
    .in("status", [...SETTLED]);
  const bookable =
    ctx !== null &&
    (ctx.appointment.status === "pending_deposit" || ctx.appointment.status === "expired") &&
    !otherSettled?.length;

  const paidAt = new Date().toISOString();
  if (!bookable) {
    // Paid twice, or the tech cancelled while the client was paying: give it back.
    await refundPayment(pi, depositId);
    await admin
      .from("deposits")
      .update({ status: "refunded", stripe_payment_intent_id: pi, paid_at: paidAt })
      .eq("id", depositId);
    return;
  }

  const { data: updated, error } = await admin
    .from("deposits")
    .update({ status: "paid", stripe_payment_intent_id: pi, paid_at: paidAt })
    .eq("id", depositId)
    .in("status", ["pending", "failed"])
    .select("id");
  if (error) throw new Error(`Marking deposit paid failed: ${error.message}`);
  if (!updated?.length) return;

  const { error: confirmError } = await admin
    .from("appointments")
    .update({ status: "confirmed", hold_expires_at: null })
    .eq("id", appointmentId)
    .in("status", ["pending_deposit", "expired"]);
  if (confirmError) throw new Error(`Confirming appointment failed: ${confirmError.message}`);

  const { appointment: a, tech, serviceName } = ctx;
  const when = formatWhen(a.starts_at, tech.timezone);
  const amount = formatCents(deposit.amount_cents);
  await notifyForAppointment({
    appointmentId,
    to: { name: a.client_name, email: a.client_email, phone: a.client_phone },
    template: "booking_confirmed",
    data: {
      businessName: tech.business_name ?? "your lash tech",
      serviceName,
      when,
      amount,
      detailsUrl: payUrl(appointmentId),
    },
  });
  await notifyForAppointment({
    appointmentId,
    to: { email: tech.email },
    template: "tech_deposit_paid",
    data: {
      clientName: a.client_name,
      serviceName,
      when,
      amount,
      appointmentUrl: appointmentUrl(appointmentId),
    },
  });
}

/** checkout.session.expired: that attempt is over; the pay link still works until its hold ends. */
export async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  const depositId = session.metadata?.deposit_id;
  if (!depositId) return;
  await createAdminClient()
    .from("deposits")
    .update({ status: "failed" })
    .eq("id", depositId)
    .eq("status", "pending");
}

/** charge.refunded: record full refunds, including ones made in the Stripe dashboard. */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const pi = paymentIntentId(charge.payment_intent);
  if (!pi || !charge.refunded) return;
  await createAdminClient()
    .from("deposits")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", pi)
    .neq("status", "refunded");
}

/** Refunds the appointment's paid deposit (tech cancelled). Returns the amount refunded. */
export async function refundAppointmentDeposit(appointmentId: string): Promise<number | null> {
  const admin = createAdminClient();
  const { data: deposit } = await admin
    .from("deposits")
    .select("id, amount_cents, stripe_payment_intent_id")
    .eq("appointment_id", appointmentId)
    .eq("status", "paid")
    .maybeSingle();
  if (!deposit?.stripe_payment_intent_id) return null;

  await refundPayment(deposit.stripe_payment_intent_id, deposit.id);
  const { error } = await admin
    .from("deposits")
    .update({ status: "refunded" })
    .eq("id", deposit.id);
  if (error) throw new Error(`Marking deposit refunded failed: ${error.message}`);
  return deposit.amount_cents;
}

/** Stops any open checkout for the appointment, so a cancelled booking can't be paid. */
export async function expireOpenCheckouts(appointmentId: string): Promise<void> {
  const { data: open } = await createAdminClient()
    .from("deposits")
    .select("stripe_checkout_session_id")
    .eq("appointment_id", appointmentId)
    .eq("status", "pending");
  for (const d of open ?? []) {
    if (!d.stripe_checkout_session_id) continue;
    try {
      await getStripe().checkout.sessions.expire(d.stripe_checkout_session_id);
    } catch (err) {
      // Already expired or completed; the webhook handles a late payment by refunding.
      console.error("Expiring checkout session failed", err);
    }
  }
}

/** Moves a paid deposit to its final state after the appointment. */
export async function settleDeposit(
  appointmentId: string,
  outcome: "applied" | "forfeited",
): Promise<number | null> {
  const { data, error } = await createAdminClient()
    .from("deposits")
    .update({ status: outcome })
    .eq("appointment_id", appointmentId)
    .eq("status", "paid")
    .select("amount_cents");
  if (error) throw new Error(`Settling deposit failed: ${error.message}`);
  return data?.[0]?.amount_cents ?? null;
}
