"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ACTIVE_STATUSES, HELD_STATUSES } from "@/lib/catering/bookings";
import {
  bookingCalendar,
  bookingStatusUrl,
  bookingWhen,
  ownerCancelRefund,
  readQuote,
} from "@/lib/catering/server";
import { formatEventDate } from "@/lib/catering/dates";
import { optionalText } from "@/lib/forms";
import { formatCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";

/*
 * Owner actions on a catering booking. Status and notes are written as the owner
 * (RLS + column grants); payments and refunds go through server code, scoped to
 * the owner's own booking.
 */

async function ownBooking(bookingId: string) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!z.uuid().safeParse(bookingId).success) notFound();
  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("catering_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.tech_id !== user.id) notFound();
  return { user, supabase, booking };
}

const back = (id: string, flag?: string) => {
  revalidatePath("/dashboard/catering", "layout");
  redirect(`/dashboard/catering/bookings/${id}${flag ? `?${flag}=1` : ""}`);
};

export async function saveNotes(bookingId: string, formData: FormData): Promise<void> {
  const { supabase, booking } = await ownBooking(bookingId);
  const notes = optionalText(2000).safeParse(String(formData.get("owner_notes") ?? ""));
  if (!notes.success) back(booking.id);
  const { error } = await supabase
    .from("catering_bookings")
    .update({ owner_notes: notes.data })
    .eq("id", booking.id);
  if (error) throw new Error(`Saving notes failed: ${error.message}`);
  back(booking.id, "saved");
}

/** Cancels the event and refunds everything the host paid, automatically. */
export async function cancelBooking(bookingId: string, formData: FormData): Promise<void> {
  const { supabase, booking, user } = await ownBooking(bookingId);
  if (!(ACTIVE_STATUSES as readonly string[]).includes(booking.status)) back(booking.id);
  const reason = optionalText(500).safeParse(String(formData.get("reason") ?? ""));
  // Refund first: if Stripe fails, the booking stays active and the owner can retry.
  const refundedCents = await ownerCancelRefund(booking.id);
  const { error } = await supabase
    .from("catering_bookings")
    .update({
      status: "cancelled",
      cancelled_by: "owner",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason.success ? reason.data : null,
      hold_expires_at: null,
    })
    .eq("id", booking.id);
  if (error) throw new Error(`Cancelling booking failed: ${error.message}`);

  if ((HELD_STATUSES as readonly string[]).includes(booking.status)) {
    const { data: owner } = await supabase
      .from("profiles")
      .select("business_name, email")
      .eq("id", user.id)
      .single();
    await notify({
      to: { name: booking.host_name, email: booking.host_email },
      template: "catering_cancelled_host",
      data: {
        businessName: owner?.business_name ?? "Your caterer",
        ownerEmail: owner?.email ?? "",
        when: bookingWhen(booking),
        reason: reason.success ? reason.data : null,
        refunded: refundedCents > 0 ? formatCents(refundedCents) : null,
      },
    });
  }
  back(booking.id, "cancelled");
}

export async function markCompleted(bookingId: string): Promise<void> {
  const { supabase, booking } = await ownBooking(bookingId);
  if (!(HELD_STATUSES as readonly string[]).includes(booking.status)) back(booking.id);
  const { error } = await supabase
    .from("catering_bookings")
    .update({ status: "completed" })
    .eq("id", booking.id);
  if (error) throw new Error(`Completing booking failed: ${error.message}`);
  back(booking.id);
}

/** Refunds one paid payment in full. The owner's choice, so the processing fee isn't returned (like Dibs deposits). */
export async function refundPayment(bookingId: string, paymentId: string): Promise<void> {
  const { booking } = await ownBooking(bookingId);
  if (!z.uuid().safeParse(paymentId).success) notFound();
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("catering_payments")
    .select("id, stripe_payment_intent_id, status")
    .eq("id", paymentId)
    .eq("booking_id", booking.id)
    .maybeSingle();
  if (!payment || payment.status !== "paid" || !payment.stripe_payment_intent_id) back(booking.id);
  await getStripe().refunds.create(
    {
      payment_intent: payment!.stripe_payment_intent_id!,
      reverse_transfer: true,
      refund_application_fee: false,
    },
    { idempotencyKey: `catering-owner-refund-${payment!.id}` },
  );
  const { error } = await admin
    .from("catering_payments")
    .update({ status: "refunded" })
    .eq("id", payment!.id);
  if (error) throw new Error(`Recording refund failed: ${error.message}`);
  back(booking.id, "refunded");
}

export async function resendConfirmation(bookingId: string): Promise<void> {
  const { supabase, booking, user } = await ownBooking(bookingId);
  if (!(HELD_STATUSES as readonly string[]).includes(booking.status)) back(booking.id);
  const { data: owner } = await supabase
    .from("profiles")
    .select("business_name, email")
    .eq("id", user.id)
    .single();
  const { data: paid } = await createAdminClient()
    .from("catering_payments")
    .select("amount_cents")
    .eq("booking_id", booking.id)
    .eq("status", "paid");
  const business = owner?.business_name ?? "Your caterer";
  const q = readQuote(booking);
  await notify({
    to: { name: booking.host_name, email: booking.host_email },
    template: "catering_booked_host",
    data: {
      businessName: business,
      ownerEmail: owner?.email ?? "",
      when: bookingWhen(booking),
      guests: booking.guest_count,
      packageName: q?.packageName ?? "Catering",
      total: formatCents(booking.total_cents),
      paid: formatCents((paid ?? []).reduce((s, p) => s + p.amount_cents, 0)),
      balanceLine:
        booking.status !== "paid_in_full" && booking.balance_cents > 0 && booking.balance_due_date
          ? `${formatCents(booking.balance_cents)} due ${formatEventDate(booking.balance_due_date)}`
          : null,
      statusUrl: bookingStatusUrl(booking.public_token),
      calendar: bookingCalendar(booking, business),
    },
  });
  back(booking.id, "resent");
}
