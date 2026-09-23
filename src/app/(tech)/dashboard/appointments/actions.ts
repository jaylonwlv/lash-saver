"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { loadAppointmentContext } from "@/lib/appointments";
import { PAY_LINK_VALID_HOURS } from "@/lib/config";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { formatCents } from "@/lib/money";
import { notifyForAppointment } from "@/lib/notifications/log";
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
      .select("timezone, stripe_charges_enabled, subscription_status")
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
  if (!profile.stripe_charges_enabled) {
    return { message: "Connect Stripe on your dashboard before creating pay links.", values };
  }
  if (!canSendPayLinks(profile.subscription_status)) {
    return { message: "Start your free trial or subscribe to send pay links.", values };
  }
  if (!service?.is_active) return { errors: { service_id: "Pick a service." }, values };

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
      deposit_cents: service.deposit_cents,
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
    .select("id, status, starts_at")
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
        businessName: ctx.tech.business_name ?? "Your lash tech",
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

  let refunded: number | null = null;
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
          businessName: ctx.tech.business_name ?? "Your lash tech",
          amount: formatCents(refunded),
        },
      });
    }
  }
  done(appointmentId);
}
