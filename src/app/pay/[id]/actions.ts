"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appointmentUrl, cancellationTerms, loadAppointmentContext } from "@/lib/appointments";
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
  expired: "This pay link has expired. Message your lash tech for a new one.",
  tech_not_ready: "Your lash tech can't take payments yet. Please let them know.",
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
      message: "This appointment can't be cancelled online. Please message your lash tech.",
    };
  }

  const terms = cancellationTerms(a, tech.cancellation_window_hours);
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
      ? await refundAppointmentDeposit(a.id)
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
  const businessName = tech.business_name ?? "your lash tech";
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

  revalidatePath(`/pay/${a.id}`);
  redirect(`/pay/${a.id}`);
}
