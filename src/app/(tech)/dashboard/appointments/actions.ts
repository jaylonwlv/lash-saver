"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { cancelNote, loadAppointmentContext, payUrl } from "@/lib/appointments";
import { PAY_LINK_VALID_HOURS } from "@/lib/config";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { formatCents } from "@/lib/money";
import { canTakeDeposits } from "@/lib/payments";
import { notifyForAppointment } from "@/lib/notifications/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeErrorMessage } from "@/lib/stripe/connect";
import {
  expireOpenCheckouts,
  refundAppointmentDeposit,
  settleDeposit,
} from "@/lib/stripe/deposits";
import { createClient, getUser } from "@/lib/supabase/server";
import { canSendPayLinks } from "@/lib/subscription";
import { formatWhen, zonedTimeToUtc } from "@/lib/time";
import { appointmentIdSchema, appointmentSchema } from "./schema";

export async function createAppointment(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const values = formValues(formData);
  const parsed = appointmentSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const input = parsed.data;

  const supabase = await createClient();
  const [{ data: profile }, { data: service }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "timezone, subscription_status, deposit_method, stripe_charges_enabled, cashapp_tag, zelle_contact, venmo_handle",
      )
      .eq("id", user.id)
      .single(),
    // RLS limits this to the tech's own services.
    supabase
      .from("services")
      .select("id, duration_minutes, price_cents, deposit_cents, is_active")
      .eq("id", input.service_id)
      .maybeSingle(),
  ]);
  if (!profile) throw new Error("Profile not found");
  if (!canTakeDeposits(profile)) {
    return { message: "Set up deposits on your dashboard before creating pay links.", values };
  }
  if (!canSendPayLinks(profile.subscription_status)) {
    return { message: "Start your free trial or subscribe to send pay links.", values };
  }
  if (!service?.is_active) return { errors: { service_id: "Pick a service." }, values };
  if (input.deposit > service.price_cents) {
    return {
      errors: {
        deposit: `The deposit can't be more than the ${formatCents(service.price_cents)} price.`,
      },
      values,
    };
  }

  const startsAt = zonedTimeToUtc(input.date, input.time, profile.timezone);
  if (!startsAt) {
    return { errors: { time: "That time doesn't exist on that date (clock change)." }, values };
  }
  const now = new Date();
  if (startsAt <= now) return { errors: { date: "Pick a time in the future." }, values };
  const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);

  // Don't double-book over a confirmed appointment or a pay link still waiting.
  const { data: clash } = await supabase
    .from("appointments")
    .select("client_name, starts_at")
    .eq("tech_id", user.id)
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString())
    .or(
      `status.eq.confirmed,and(status.eq.pending_deposit,hold_expires_at.gt."${now.toISOString()}")`,
    )
    .limit(1)
    .maybeSingle();
  if (clash) {
    return {
      errors: {
        time: `That overlaps ${clash.client_name} at ${formatWhen(clash.starts_at, profile.timezone)}.`,
      },
      values,
    };
  }

  const holdUntil = Math.min(now.getTime() + PAY_LINK_VALID_HOURS * 3_600_000, startsAt.getTime());
  const { data: created, error } = await supabase
    .from("appointments")
    .insert({
      tech_id: user.id,
      service_id: service.id,
      client_name: input.client_name,
      client_email: input.client_email,
      client_phone: input.client_phone,
      client_instagram: input.client_instagram,
      notes: input.notes,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "pending_deposit",
      hold_expires_at: new Date(holdUntil).toISOString(),
      price_cents: service.price_cents,
      deposit_cents: input.deposit,
      payment_method: profile.deposit_method,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("Creating appointment failed", error);
    return { message: "Couldn't create the appointment. Try again.", values };
  }

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/appointments/${created.id}?new=1`);
}

/** Loads the tech's own appointment (RLS) or 404s. */
async function ownAppointment(appointmentId: string) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!appointmentIdSchema.safeParse(appointmentId).success) notFound();
  const supabase = await createClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, status, starts_at, payment_method, deposit_cents")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appointment) notFound();
  return { supabase, appointment };
}

function done(appointmentId: string): never {
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/appointments/${appointmentId}`);
}

/** Client showed up: the deposit goes toward the service. */
export async function markCompleted(appointmentId: string): Promise<FormState> {
  const { supabase, appointment } = await ownAppointment(appointmentId);
  if (appointment.status !== "confirmed" || new Date(appointment.starts_at) > new Date()) {
    return { message: "You can mark this once the appointment has started." };
  }
  const { error } = await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", appointmentId)
    .eq("status", "confirmed");
  if (error) throw new Error(`Completing appointment failed: ${error.message}`);
  await settleDeposit(appointmentId, "applied");
  done(appointmentId);
}

/** Client didn't show: the tech keeps the deposit. */
export async function markNoShow(appointmentId: string): Promise<FormState> {
  const { supabase, appointment } = await ownAppointment(appointmentId);
  if (appointment.status !== "confirmed" || new Date(appointment.starts_at) > new Date()) {
    return { message: "You can mark a no-show once the appointment time has passed." };
  }
  const { error } = await supabase
    .from("appointments")
    .update({ status: "no_show" })
    .eq("id", appointmentId)
    .eq("status", "confirmed");
  if (error) throw new Error(`Marking no-show failed: ${error.message}`);
  const kept = await settleDeposit(appointmentId, "forfeited");

  const ctx = await loadAppointmentContext(appointmentId);
  if (ctx && kept) {
    await notifyForAppointment({
      appointmentId,
      to: { email: ctx.appointment.client_email, phone: ctx.appointment.client_phone },
      template: "no_show_recorded",
      data: {
        businessName: ctx.tech.business_name ?? "Your provider",
        when: formatWhen(ctx.appointment.starts_at, ctx.tech.timezone),
        amount: formatCents(kept),
      },
    });
  }
  done(appointmentId);
}

/** Tech cancels. A waiting pay link stops working; a paid deposit is refunded in full. */
export async function cancelAppointment(appointmentId: string): Promise<FormState> {
  const { supabase, appointment } = await ownAppointment(appointmentId);
  if (appointment.status !== "pending_deposit" && appointment.status !== "confirmed") {
    return { message: "This appointment can't be cancelled." };
  }

  let refunded: { amountCents: number; manual: boolean } | null = null;
  if (appointment.status === "confirmed") {
    try {
      refunded = await refundAppointmentDeposit(appointmentId);
    } catch (err) {
      console.error("Refund failed", err);
      return {
        message: `The refund didn't go through, so nothing was cancelled. ${stripeErrorMessage(err)}`,
      };
    }
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled_by_tech", hold_expires_at: null })
    .eq("id", appointmentId)
    .in("status", ["pending_deposit", "confirmed"]);
  if (error) throw new Error(`Cancelling appointment failed: ${error.message}`);
  await expireOpenCheckouts(appointmentId);

  if (refunded) {
    const ctx = await loadAppointmentContext(appointmentId);
    if (ctx) {
      await notifyForAppointment({
        appointmentId,
        to: { email: ctx.appointment.client_email, phone: ctx.appointment.client_phone },
        template: "deposit_refunded",
        data: {
          businessName: ctx.tech.business_name ?? "Your provider",
          amount: formatCents(refunded.amountCents),
          fromProvider: refunded.manual,
        },
      });
    }
  }
  done(appointmentId);
}

/**
 * Cash App / Zelle / Venmo deposit arrived: the pro confirms, which books the
 * appointment. Works whether or not the client tapped "I've sent it".
 */
export async function confirmManualDeposit(appointmentId: string): Promise<FormState> {
  const { supabase, appointment } = await ownAppointment(appointmentId);
  if (appointment.payment_method !== "manual") notFound();
  if (appointment.status !== "pending_deposit" && appointment.status !== "expired") {
    return { message: "This appointment isn't waiting for a deposit." };
  }
  if (!appointment.deposit_cents) return { message: "This appointment has no deposit amount." };

  const admin = createAdminClient();
  const paidAt = new Date().toISOString();
  const { data: pending } = await admin
    .from("deposits")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("method", "manual")
    .eq("status", "pending")
    .maybeSingle();
  const { error: depositError } = pending
    ? await admin.from("deposits").update({ status: "paid", paid_at: paidAt }).eq("id", pending.id)
    : await admin.from("deposits").insert({
        appointment_id: appointmentId,
        tech_id: (await getUser())!.id,
        amount_cents: appointment.deposit_cents,
        platform_fee_cents: 0,
        method: "manual",
        status: "paid",
        paid_at: paidAt,
      });
  if (depositError) throw new Error(`Recording deposit failed: ${depositError.message}`);

  const { error } = await supabase
    .from("appointments")
    .update({ status: "confirmed", hold_expires_at: null })
    .eq("id", appointmentId)
    .in("status", ["pending_deposit", "expired"]);
  if (error) throw new Error(`Confirming appointment failed: ${error.message}`);

  const ctx = await loadAppointmentContext(appointmentId);
  if (ctx) {
    await notifyForAppointment({
      appointmentId,
      to: {
        name: ctx.appointment.client_name,
        email: ctx.appointment.client_email,
        phone: ctx.appointment.client_phone,
      },
      template: "booking_confirmed",
      data: {
        businessName: ctx.tech.business_name ?? "your provider",
        serviceName: ctx.serviceName,
        when: formatWhen(ctx.appointment.starts_at, ctx.tech.timezone),
        amount: formatCents(appointment.deposit_cents),
        cancelNote: cancelNote(ctx),
        detailsUrl: payUrl(appointmentId),
      },
    });
  }
  done(appointmentId);
}

/** The client said they sent it, but it isn't there: tell them, and let them try again. */
export async function rejectManualDeposit(appointmentId: string): Promise<FormState> {
  const { supabase, appointment } = await ownAppointment(appointmentId);
  if (appointment.payment_method !== "manual" || appointment.status !== "pending_deposit") {
    return { message: "This appointment isn't waiting for a deposit." };
  }
  await createAdminClient()
    .from("deposits")
    .update({ status: "failed" })
    .eq("appointment_id", appointmentId)
    .eq("method", "manual")
    .eq("status", "pending");
  const { error } = await supabase
    .from("appointments")
    .update({ client_marked_sent_at: null })
    .eq("id", appointmentId);
  if (error) throw new Error(`Updating appointment failed: ${error.message}`);

  const ctx = await loadAppointmentContext(appointmentId);
  if (ctx) {
    await notifyForAppointment({
      appointmentId,
      to: { email: ctx.appointment.client_email, phone: ctx.appointment.client_phone },
      template: "manual_deposit_not_received",
      data: {
        businessName: ctx.tech.business_name ?? "Your provider",
        amount: formatCents(appointment.deposit_cents ?? 0),
        payUrl: payUrl(appointmentId),
      },
    });
  }
  done(appointmentId);
}

/** The pro sent a Cash App / Zelle / Venmo refund they owed. */
export async function markRefundSent(appointmentId: string): Promise<FormState> {
  await ownAppointment(appointmentId);
  const { data, error } = await createAdminClient()
    .from("deposits")
    .update({ status: "refunded" })
    .eq("appointment_id", appointmentId)
    .eq("status", "refund_due")
    .select("id");
  if (error) throw new Error(`Marking refund sent failed: ${error.message}`);
  if (!data?.length) return { message: "There's no refund waiting on this appointment." };
  done(appointmentId);
}
