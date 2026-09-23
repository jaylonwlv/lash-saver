"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  appointmentUrl,
  cancellationTerms,
  loadAppointmentContext,
  payability,
  policySummary,
} from "@/lib/appointments";
import { MANUAL_APP_LABEL, manualHandles } from "@/lib/payments";
import type { FormState } from "@/lib/forms";
import { formatCents } from "@/lib/money";
import { notifyForAppointment } from "@/lib/notifications/log";
import { stripeErrorMessage } from "@/lib/stripe/connect";
import {
  PayError,
  createDepositCheckout,
  refundAppointmentDeposit,
  settleDeposit,
} from "@/lib/stripe/deposits";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatWhen } from "@/lib/time";

const PAY_ERROR_MESSAGE: Record<PayError["reason"], string> = {
  closed: "This appointment can't be paid anymore. Refresh the page to see its status.",
  expired: "This pay link has expired. Message your provider for a new one.",
  tech_not_ready: "Your provider can't take payments yet. Please let them know.",
};

/** Client agreed to the policy: send them to Stripe Checkout for the deposit. */
export async function payDeposit(
  appointmentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(appointmentId).success) {
    return { message: PAY_ERROR_MESSAGE.closed };
  }
  if (formData.get("agree") !== "on") {
    return { errors: { agree: "Please agree to the deposit policy to continue." } };
  }

  let url: string;
  try {
    url = await createDepositCheckout(appointmentId);
  } catch (err) {
    if (err instanceof PayError) return { message: PAY_ERROR_MESSAGE[err.reason] };
    console.error("Creating checkout failed", err);
    return { message: stripeErrorMessage(err) };
  }
  redirect(url);
}

/**
 * Client cancels from their pay link. Refund eligibility is decided here, at the
 * moment they confirm, using the policy snapshot they agreed to when paying.
 */
export async function cancelByClient(
  appointmentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(appointmentId).success) return { message: PAY_ERROR_MESSAGE.closed };
  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx) return { message: PAY_ERROR_MESSAGE.closed };
  const { appointment: a, tech, serviceName } = ctx;
  if (a.status !== "confirmed" || new Date(a.starts_at) <= new Date()) {
    return {
      message: "This appointment can't be cancelled online. Please message your provider.",
    };
  }

  const terms = cancellationTerms(a, tech.cancellation_window_hours);
  const manual = a.payment_method === "manual";
  // The page was loaded before the refund deadline passed: don't cancel on terms
  // the client didn't see. Refresh the page so they can decide again.
  if ((formData.get("expect_refund") === "1") !== terms.refundable) {
    revalidatePath(`/pay/${a.id}`);
    return {
      message: terms.refundable
        ? "Good news: you can still get your deposit back. Tap cancel again to confirm."
        : `The refund deadline has just passed, so cancelling now means your deposit is kept. Tap cancel again if you still want to cancel.`,
    };
  }

  let amount: number | null;
  try {
    amount = terms.refundable
      ? ((await refundAppointmentDeposit(a.id))?.amountCents ?? null)
      : await settleDeposit(a.id, "forfeited");
  } catch (err) {
    console.error("Client cancel failed", err);
    return {
      message: `Something went wrong, so your appointment is still booked. ${stripeErrorMessage(err)}`,
    };
  }

  const { error } = await createAdminClient()
    .from("appointments")
    .update({ status: "cancelled_by_client" })
    .eq("id", a.id)
    .eq("status", "confirmed");
  if (error) throw new Error(`Cancelling appointment failed: ${error.message}`);

  const when = formatWhen(a.starts_at, tech.timezone);
  const amountText = formatCents(amount ?? a.deposit_cents ?? 0);
  const businessName = tech.business_name ?? "your provider";
  await notifyForAppointment({
    appointmentId: a.id,
    to: { name: a.client_name, email: a.client_email, phone: a.client_phone },
    template: "cancellation_confirmed",
    data: {
      businessName,
      serviceName,
      when,
      amount: amountText,
      refunded: terms.refundable,
      refundFromProvider: manual,
      windowHours: terms.windowHours,
    },
  });
  await notifyForAppointment({
    appointmentId: a.id,
    to: { email: tech.email },
    template: "client_cancelled",
    data: {
      clientName: a.client_name,
      serviceName,
      when,
      amount: amountText,
      refunded: terms.refundable,
      appointmentUrl: appointmentUrl(a.id),
    },
  });

  if (manual && terms.refundable && amount) {
    await notifyForAppointment({
      appointmentId: a.id,
      to: { email: tech.email },
      template: "manual_refund_due",
      data: {
        clientName: a.client_name,
        amount: amountText,
        reason: `${a.client_name} cancelled ${when}, early enough for a refund.`,
        appointmentUrl: appointmentUrl(a.id),
      },
    });
  }

  revalidatePath(`/pay/${a.id}`);
  redirect(`/pay/${a.id}`);
}

const manualAppSchema = z.enum(["cashapp", "zelle", "venmo"]);

/**
 * Client agreed to the policy and says they sent the deposit with the pro's own
 * Cash App, Zelle or Venmo. Records the agreement, and asks the pro to confirm.
 * Nothing is booked until the pro taps Received.
 */
export async function clientSentDeposit(
  appointmentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(appointmentId).success) return { message: PAY_ERROR_MESSAGE.closed };
  if (formData.get("agree") !== "on") {
    return { errors: { agree: "Please agree to the deposit policy to continue." } };
  }
  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx || ctx.appointment.payment_method !== "manual") {
    return { message: PAY_ERROR_MESSAGE.closed };
  }
  const { appointment: a, tech } = ctx;
  const state = payability(a);
  if (state !== "ok") return { message: PAY_ERROR_MESSAGE[state] };

  const handles = manualHandles(tech);
  const app = manualAppSchema.safeParse(formData.get("app") ?? handles[0]?.app);
  if (!app.success || !handles.some((h) => h.app === app.data)) {
    return { errors: { app: "Pick how you paid." } };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("appointments")
    .update({
      client_marked_sent_at: now,
      policy_accepted_at: now,
      policy_text_snapshot: policySummary(tech.cancellation_window_hours, tech.policy_text),
      cancellation_window_hours_snapshot: tech.cancellation_window_hours,
    })
    .eq("id", a.id)
    .eq("status", "pending_deposit");
  if (error) throw new Error(`Recording sent deposit failed: ${error.message}`);

  // One pending manual deposit per appointment; replace an earlier attempt.
  await admin
    .from("deposits")
    .update({ status: "failed" })
    .eq("appointment_id", a.id)
    .eq("method", "manual")
    .eq("status", "pending");
  await admin.from("deposits").insert({
    appointment_id: a.id,
    tech_id: tech.id,
    amount_cents: a.deposit_cents ?? 0,
    platform_fee_cents: 0,
    method: "manual",
    manual_app: app.data,
    status: "pending",
  });

  await notifyForAppointment({
    appointmentId: a.id,
    to: { email: tech.email },
    template: "manual_deposit_sent",
    data: {
      clientName: a.client_name,
      amount: formatCents(a.deposit_cents ?? 0),
      app: MANUAL_APP_LABEL[app.data],
      when: formatWhen(a.starts_at, tech.timezone),
      appointmentUrl: appointmentUrl(a.id),
    },
  });

  revalidatePath(`/pay/${a.id}`);
  redirect(`/pay/${a.id}`);
}
