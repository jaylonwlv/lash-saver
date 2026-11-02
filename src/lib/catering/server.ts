import "server-only";
import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import { buildCalendar } from "@/lib/calendar";
import { CHECKOUT_SESSION_MINUTES, DEFAULT_CURRENCY } from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { formatCents, processingFeeCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { getStripe } from "@/lib/stripe/server";
import { canCreatePayLink, canSendPayLinks } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, Tables } from "@/lib/supabase/database.types";
import { zonedTimeToUtc } from "@/lib/time";
import {
  balanceDueDate,
  bookableRange,
  formatClock,
  formatEventDate,
  formatShortDate,
  minutesBetween,
  payInFullNow,
  todayIn,
} from "./dates";
import { buildAgreement, signatureBlock } from "./agreement";
import { holdStillOpen } from "./bookings";
import { hostCancelPlan, ownerCancelPlan, type PaidPayment, type RefundPlan } from "./refunds";
import { calculateQuote, quoteErrorMessage, type Quote } from "./quote";

/*
 * Catering bookings and their payments. Like Dibs deposits, payments are
 * destination charges to the owner's Stripe account with the processing fee as
 * the application fee, and only webhooks mark them paid. The date is held by
 * hold_catering_date (a locked capacity check in the database) from the moment the
 * host starts checkout until the hold expires with the Checkout session.
 */

type Booking = Tables<"catering_bookings">;
type Owner = Pick<
  Tables<"profiles">,
  | "id"
  | "business_name"
  | "slug"
  | "email"
  | "timezone"
  | "stripe_account_id"
  | "stripe_charges_enabled"
  | "subscription_status"
>;

const OWNER_COLUMNS =
  "id, business_name, slug, email, timezone, stripe_account_id, stripe_charges_enabled, subscription_status";

const appUrl = () => publicEnv().NEXT_PUBLIC_APP_URL;
export const bookingStatusUrl = (token: string) => `${appUrl()}/e/${token}`;
export const bookingAdminUrl = (id: string) => `${appUrl()}/dashboard/catering/bookings/${id}`;
export const quotePageUrl = (slug: string | null) => (slug ? `${appUrl()}/c/${slug}` : appUrl());

/** The quote as stored on the booking (labels as the host saw them). */
export type QuoteSnapshot = Quote & { packageName: string; addOnNames: string[] };

export function readQuote(booking: Pick<Booking, "quote">): QuoteSnapshot | null {
  const q = booking.quote;
  if (typeof q !== "object" || q === null || Array.isArray(q) || !Array.isArray(q.lines))
    return null;
  return q as unknown as QuoteSnapshot;
}

/** "Saturday, June 14, 2027, 5:00 PM – 7:00 PM" */
export function bookingWhen(b: Pick<Booking, "event_date" | "start_time" | "end_time">): string {
  return `${formatEventDate(b.event_date)}, ${formatClock(b.start_time)} – ${formatClock(b.end_time)}`;
}

export function bookingCalendar(b: Booking, businessName: string): string | undefined {
  const start = zonedTimeToUtc(b.event_date, b.start_time.slice(0, 5), b.timezone);
  const end = zonedTimeToUtc(b.event_date, b.end_time.slice(0, 5), b.timezone);
  if (!start || !end) return undefined;
  const q = readQuote(b);
  return buildCalendar([
    {
      uid: `catering-${b.id}@dibs`,
      start,
      end,
      summary: `${businessName} catering`,
      description: `${q?.packageName ?? "Catering"}, ${b.guest_count} guests\n${b.event_address}\n\nDetails: ${bookingStatusUrl(b.public_token)}`,
      url: bookingStatusUrl(b.public_token),
      alarmMinutesBefore: 24 * 60,
      status: "CONFIRMED",
    },
  ]);
}

export class CateringError extends Error {
  constructor(
    readonly reason:
      "unavailable" | "not_taking" | "price_changed" | "invalid" | "too_many" | "expired",
    message: string,
  ) {
    super(message);
  }
}

export type BookingRequest = {
  slug: string;
  event_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  package_id: string;
  add_on_ids: string[];
  event_type: Booking["event_type"];
  event_address: string;
  event_notes: string | null;
  host_name: string;
  host_email: string;
  host_phone: string | null;
  /** What the page showed, in cents; refused if the server's quote differs. */
  shown_total: number;
  shown_deposit: number;
  /** The host's typed name (checked against host_name by the schema). */
  signature: string;
};

export type Signer = { ip: string | null; userAgent: string | null };

async function loadOwnerBySlug(slug: string) {
  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("profiles")
    .select(OWNER_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (!owner) return null;
  const { data: settings } = await admin
    .from("catering_settings")
    .select("*")
    .eq("tech_id", owner.id)
    .maybeSingle();
  return settings ? { owner, settings } : null;
}

/** Can this owner take a new catering booking? First one is free, like a first pay link. */
async function ownerCanBook(owner: Owner): Promise<boolean> {
  if (!owner.stripe_charges_enabled || !owner.stripe_account_id) return false;
  const { count } = await createAdminClient()
    .from("catering_bookings")
    .select("id", { count: "exact", head: true })
    .eq("tech_id", owner.id)
    .not("deposit_paid_at", "is", null);
  return canCreatePayLink(owner.subscription_status, count ?? 0);
}

export async function cateringOpenForBookings(owner: Owner): Promise<boolean> {
  return ownerCanBook(owner);
}

/** Validates the request, recalculates the price, holds the date and opens Checkout. */
export async function startDepositCheckout(req: BookingRequest, signer: Signer): Promise<string> {
  const loaded = await loadOwnerBySlug(req.slug);
  if (!loaded || !loaded.settings.is_published)
    throw new CateringError("not_taking", "This page isn't taking bookings right now.");
  const { owner, settings } = loaded;
  if (!(await ownerCanBook(owner)))
    throw new CateringError(
      "not_taking",
      "This business isn't taking online bookings right now. Message them directly.",
    );

  const admin = createAdminClient();
  const [{ data: pkg }, { data: addOns }] = await Promise.all([
    admin
      .from("catering_packages")
      .select("*")
      .eq("id", req.package_id)
      .eq("tech_id", owner.id)
      .eq("is_active", true)
      .maybeSingle(),
    req.add_on_ids.length
      ? admin
          .from("catering_addons")
          .select("*")
          .in("id", req.add_on_ids)
          .eq("tech_id", owner.id)
          .eq("is_active", true)
      : Promise.resolve({ data: [] as Tables<"catering_addons">[] }),
  ]);
  if (!pkg || (addOns ?? []).length !== new Set(req.add_on_ids).size)
    throw new CateringError(
      "price_changed",
      "This menu just changed. Check your choices and the new price.",
    );

  const today = todayIn(owner.timezone);
  const { first, last } = bookableRange(today, settings);
  if (req.event_date < first || req.event_date > last)
    throw new CateringError("unavailable", "That date isn't available. Pick another.");
  const eventMinutes = minutesBetween(req.start_time, req.end_time);
  const payInFull = payInFullNow(req.event_date, today, settings.balance_due_days_before);

  const result = calculateQuote({
    pkg,
    addOns: addOns ?? [],
    guestCount: req.guest_count,
    eventMinutes,
    rules: settings,
    payInFull,
  });
  if (!result.ok) throw new CateringError("invalid", quoteErrorMessage(result.error));
  const q = result.quote;
  if (q.totalCents !== req.shown_total || q.depositCents !== req.shown_deposit)
    throw new CateringError(
      "price_changed",
      `The price changed to ${formatCents(q.totalCents)}. Check it and try again.`,
    );

  // Simple abuse limits: a host can't hold dates over and over.
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: recent } = await admin
    .from("catering_bookings")
    .select("id", { count: "exact", head: true })
    .eq("tech_id", owner.id)
    .eq("host_email", req.host_email)
    .gte("created_at", hourAgo);
  // Per device too, so nobody can hold every date by typing different emails.
  const { count: fromIp } = signer.ip
    ? await admin
        .from("catering_bookings")
        .select("id", { count: "exact", head: true })
        .eq("signer_ip", signer.ip)
        .gte("created_at", hourAgo)
    : { count: 0 };
  if ((recent ?? 0) >= 5 || (fromIp ?? 0) >= 10)
    throw new CateringError(
      "too_many",
      "Too many tries. Wait a bit, or message the business directly.",
    );

  // Their own unfinished checkout for this date shouldn't block them from trying again.
  // Same email and same device only, so nobody can cancel someone else's checkout by
  // typing their email.
  if (signer.ip) await releaseOwnHolds(owner.id, req.event_date, req.host_email, signer.ip);

  const now = new Date();
  const token = randomBytes(32).toString("base64url");
  const snapshot: QuoteSnapshot = {
    ...q,
    packageName: pkg.name,
    addOnNames: (addOns ?? []).map((a) => a.name),
  };
  const { data: bookingId, error: holdError } = await admin.rpc("hold_catering_date", {
    p_booking: {
      tech_id: owner.id,
      public_token: token,
      status: "awaiting_deposit",
      event_date: req.event_date,
      start_time: req.start_time,
      end_time: req.end_time,
      timezone: owner.timezone,
      guest_count: req.guest_count,
      package_id: pkg.id,
      add_on_ids: (addOns ?? []).map((a) => a.id),
      extra_hours: q.extraHours,
      event_type: req.event_type,
      event_address: req.event_address,
      event_notes: req.event_notes,
      host_name: req.host_name,
      host_email: req.host_email,
      host_phone: req.host_phone,
      quote: snapshot as unknown as Json,
      subtotal_cents: q.subtotalCents,
      travel_fee_cents: q.travelFeeCents,
      service_fee_cents: q.serviceFeeCents,
      tax_cents: q.taxCents,
      total_cents: q.totalCents,
      deposit_cents: q.depositCents,
      balance_cents: q.balanceCents,
      balance_due_date: payInFull
        ? null
        : balanceDueDate(req.event_date, settings.balance_due_days_before),
      policy_text_snapshot: settings.policy_text,
      terms_accepted_at: now.toISOString(),
      contract_text: buildAgreement({
        businessName: owner.business_name ?? "The caterer",
        hostName: req.host_name,
        hostEmail: req.host_email,
        eventDate: req.event_date,
        startTime: req.start_time,
        endTime: req.end_time,
        eventAddress: req.event_address,
        guestCount: req.guest_count,
        lines: q.lines,
        totalCents: q.totalCents,
        depositCents: q.depositCents,
        balanceCents: q.balanceCents,
        balanceDueDate: payInFull
          ? null
          : balanceDueDate(req.event_date, settings.balance_due_days_before),
        refund: {
          host_can_cancel: settings.host_can_cancel,
          full_refund_days: settings.full_refund_days,
        },
        policyText: settings.policy_text,
        contractTerms: settings.contract_terms,
      }),
      signature_name: req.signature,
      signed_at: now.toISOString(),
      signer_ip: signer.ip,
      signer_user_agent: signer.userAgent,
      host_can_cancel: settings.host_can_cancel,
      full_refund_days: settings.full_refund_days,
      hold_expires_at: new Date(now.getTime() + CHECKOUT_SESSION_MINUTES * 60_000).toISOString(),
    },
  });
  if (holdError) throw new Error(`Holding catering date failed: ${holdError.message}`);
  if (!bookingId)
    throw new CateringError("unavailable", "Sorry, that date was just booked. Pick another.");

  const { data: booking, error } = await admin
    .from("catering_bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (error || !booking) throw new Error(`Loading new booking failed: ${error?.message}`);
  try {
    return await openCheckout(owner, booking, "deposit");
  } catch (err) {
    // Release the date if Checkout couldn't open.
    await admin.from("catering_bookings").update({ status: "expired" }).eq("id", booking.id);
    throw err;
  }
}

async function releaseOwnHolds(techId: string, date: string, email: string, ip: string) {
  const admin = createAdminClient();
  const { data: holds } = await admin
    .from("catering_bookings")
    .select("id")
    .eq("tech_id", techId)
    .eq("event_date", date)
    .eq("host_email", email)
    .eq("signer_ip", ip)
    .eq("status", "awaiting_deposit");
  for (const h of holds ?? []) {
    await expireOpenCateringCheckouts(h.id);
    await admin
      .from("catering_bookings")
      .update({ status: "expired" })
      .eq("id", h.id)
      .eq("status", "awaiting_deposit");
  }
}

/** Opens (or reuses) a Checkout session for the deposit or the balance. */
async function openCheckout(
  owner: Owner,
  booking: Booking,
  kind: "deposit" | "balance",
): Promise<string> {
  if (!owner.stripe_account_id || !owner.stripe_charges_enabled)
    throw new CateringError(
      "not_taking",
      "This business can't take card payments right now. Message them directly.",
    );
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: open } = await admin
    .from("catering_payments")
    .select("stripe_checkout_session_id")
    .eq("booking_id", booking.id)
    .eq("kind", kind)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open?.stripe_checkout_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(open.stripe_checkout_session_id);
    if (existing.status === "open" && existing.url) return existing.url;
  }

  const amount = kind === "deposit" ? booking.deposit_cents : booking.balance_cents;
  if (amount <= 0) throw new Error(`Booking ${booking.id} has no ${kind} to pay`);
  const fee = processingFeeCents(amount);
  const { data: payment, error } = await admin
    .from("catering_payments")
    .insert({
      booking_id: booking.id,
      tech_id: owner.id,
      kind,
      amount_cents: amount,
      platform_fee_cents: fee,
    })
    .select("id")
    .single();
  if (error || !payment) throw new Error(`Creating catering payment failed: ${error?.message}`);

  const business = owner.business_name ?? "your caterer";
  const when = `${formatShortDate(booking.event_date)}, ${formatClock(booking.start_time)}`;
  const label =
    kind === "balance"
      ? `Balance: catering with ${business}`
      : booking.balance_cents === 0
        ? `Paid in full: catering with ${business}`
        : `Deposit: catering with ${business}`;
  const metadata = {
    kind: "catering",
    booking_id: booking.id,
    payment_id: payment.id,
    tech_id: owner.id,
  };
  const statusUrl = bookingStatusUrl(booking.public_token);
  const policy = booking.policy_text_snapshot;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: booking.host_email,
      client_reference_id: booking.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: DEFAULT_CURRENCY,
            unit_amount: amount,
            product_data: { name: label, description: `${when} · ${booking.guest_count} guests` },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: fee > 0 ? fee : undefined,
        transfer_data: { destination: owner.stripe_account_id },
        description: `${label}, ${when}`,
        metadata,
      },
      ...(policy && kind === "deposit"
        ? {
            custom_text: {
              submit: {
                message: `By paying, you agree to ${business}'s policy: ${policy}`.slice(0, 1200),
              },
            },
          }
        : {}),
      metadata,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_MINUTES * 60,
      success_url: `${statusUrl}?paid=1`,
      cancel_url: statusUrl,
    },
    { idempotencyKey: `catering-checkout-${payment.id}` },
  );
  const { error: saveError } = await admin
    .from("catering_payments")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", payment.id);
  if (saveError) throw new Error(`Saving checkout session failed: ${saveError.message}`);
  if (!session.url) throw new Error(`Checkout session ${session.id} has no URL`);
  return session.url;
}

async function loadByToken(token: string) {
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("catering_bookings")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (!booking) return null;
  const { data: owner } = await admin
    .from("profiles")
    .select(OWNER_COLUMNS)
    .eq("id", booking.tech_id)
    .single();
  return owner ? { booking, owner } : null;
}

/** "Finish paying" on the status page, while the date is still held for them. */
export async function resumeDepositCheckout(token: string): Promise<string> {
  const loaded = await loadByToken(token);
  if (!loaded) throw new CateringError("expired", "We couldn't find this booking.");
  const { booking, owner } = loaded;
  if (!holdStillOpen(booking))
    throw new CateringError("expired", "This hold ran out. Start again to check the date.");
  return openCheckout(owner, booking, "deposit");
}

export async function startBalanceCheckout(token: string): Promise<string> {
  const loaded = await loadByToken(token);
  if (!loaded) throw new CateringError("expired", "We couldn't find this booking.");
  const { booking, owner } = loaded;
  if (
    !["confirmed", "balance_due"].includes(booking.status) ||
    booking.balance_cents <= 0 ||
    booking.balance_paid_at
  )
    throw new CateringError("invalid", "There's no balance to pay on this booking.");
  return openCheckout(owner, booking, "balance");
}

/** Stops any open Checkout for the booking, so a cancelled booking can't be paid. */
export async function expireOpenCateringCheckouts(bookingId: string): Promise<void> {
  const { data: open } = await createAdminClient()
    .from("catering_payments")
    .select("stripe_checkout_session_id")
    .eq("booking_id", bookingId)
    .eq("status", "pending");
  for (const p of open ?? []) {
    if (!p.stripe_checkout_session_id) continue;
    try {
      await getStripe().checkout.sessions.expire(p.stripe_checkout_session_id);
    } catch (err) {
      // Already expired or completed; a late payment is refunded by the webhook.
      console.error("Expiring catering checkout failed", err);
    }
  }
}

const piId = (pi: string | Stripe.PaymentIntent | null) =>
  typeof pi === "string" ? pi : (pi?.id ?? null);

async function refund(paymentIntentId: string, paymentId: string) {
  await getStripe().refunds.create(
    { payment_intent: paymentIntentId, reverse_transfer: true, refund_application_fee: true },
    { idempotencyKey: `catering-refund-${paymentId}` },
  );
}

/** checkout.session.completed for a catering payment (metadata.kind = "catering"). */
export async function handleCateringCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.payment_status !== "paid") return;
  const paymentId = session.metadata?.payment_id;
  const pi = piId(session.payment_intent);
  if (!paymentId || !pi) {
    console.error("Catering checkout without payment metadata", session.id);
    return;
  }
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("catering_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.status === "paid" || payment.status === "refunded") return; // Unknown or retry.
  const { data: booking } = await admin
    .from("catering_bookings")
    .select("*")
    .eq("id", payment.booking_id)
    .single();
  const { data: owner } = await admin
    .from("profiles")
    .select(OWNER_COLUMNS)
    .eq("id", payment.tech_id)
    .single();
  if (!booking || !owner) throw new Error(`Catering payment ${paymentId} has no booking or owner`);

  const paidAt = new Date().toISOString();
  const refundIt = async () => {
    await refund(pi, payment.id);
    await admin
      .from("catering_payments")
      .update({ status: "refunded", stripe_payment_intent_id: pi, paid_at: paidAt })
      .eq("id", payment.id);
  };
  const business = owner.business_name ?? "your caterer";
  const when = bookingWhen(booking);

  if (payment.kind === "balance") {
    if (!["confirmed", "balance_due"].includes(booking.status) || booking.balance_paid_at) {
      await refundIt(); // Cancelled meanwhile, or paid twice.
      return;
    }
    const { data: marked } = await admin
      .from("catering_payments")
      .update({ status: "paid", stripe_payment_intent_id: pi, paid_at: paidAt })
      .eq("id", payment.id)
      .in("status", ["pending", "failed"])
      .select("id");
    if (!marked?.length) return;
    await admin
      .from("catering_bookings")
      .update({ status: "paid_in_full", balance_paid_at: paidAt })
      .eq("id", booking.id)
      .in("status", ["confirmed", "balance_due"]);
    const amount = formatCents(payment.amount_cents);
    await notify({
      to: { name: booking.host_name, email: booking.host_email },
      template: "catering_balance_paid_host",
      data: {
        businessName: business,
        ownerEmail: owner.email,
        when,
        amount,
        statusUrl: bookingStatusUrl(booking.public_token),
      },
    });
    await notify({
      to: { email: owner.email },
      template: "catering_balance_paid_owner",
      data: { hostName: booking.host_name, when, amount, bookingUrl: bookingAdminUrl(booking.id) },
    });
    return;
  }

  // Deposit (or full payment).
  const today = todayIn(owner.timezone);
  const holdValid =
    booking.status === "awaiting_deposit" &&
    !!booking.hold_expires_at &&
    new Date(booking.hold_expires_at) > new Date();
  let bookable =
    (booking.status === "awaiting_deposit" || booking.status === "expired") &&
    booking.event_date >= today;
  if (bookable && !holdValid) {
    // Paid after the hold ran out: book it only if the date still has room.
    const [{ data: held }, { data: settings }, { data: blocked }] = await Promise.all([
      admin.rpc("catering_held_count", {
        p_tech: owner.id,
        p_date: booking.event_date,
        p_exclude: booking.id,
      }),
      admin.from("catering_settings").select("daily_capacity").eq("tech_id", owner.id).single(),
      admin
        .from("catering_blocked_dates")
        .select("date")
        .eq("tech_id", owner.id)
        .eq("date", booking.event_date)
        .maybeSingle(),
    ]);
    bookable = !blocked && settings !== null && (held ?? Infinity) < settings.daily_capacity;
  }
  const { data: otherPaid } = await admin
    .from("catering_payments")
    .select("id")
    .eq("booking_id", booking.id)
    .eq("kind", "deposit")
    .eq("status", "paid")
    .neq("id", payment.id);
  if (otherPaid?.length) bookable = false;

  if (!bookable) {
    await refundIt();
    if (otherPaid?.length || booking.status === "cancelled") return;
    // The date filled while they were paying.
    console.error(`Catering booking ${booking.id}: paid after the date filled; refunded`);
    await admin.from("catering_bookings").update({ status: "expired" }).eq("id", booking.id);
    const amount = formatCents(payment.amount_cents);
    await notify({
      to: { name: booking.host_name, email: booking.host_email },
      template: "catering_date_taken",
      data: {
        businessName: business,
        ownerEmail: owner.email,
        when,
        amount,
        pageUrl: quotePageUrl(owner.slug),
      },
    });
    await notify({
      to: { email: owner.email },
      template: "catering_date_taken_owner",
      data: { hostName: booking.host_name, email: booking.host_email, when, amount },
    });
    return;
  }

  const { data: marked, error } = await admin
    .from("catering_payments")
    .update({ status: "paid", stripe_payment_intent_id: pi, paid_at: paidAt })
    .eq("id", payment.id)
    .in("status", ["pending", "failed"])
    .select("id");
  if (error) throw new Error(`Marking catering payment paid failed: ${error.message}`);
  if (!marked?.length) return;

  const status =
    booking.balance_cents === 0
      ? "paid_in_full"
      : booking.balance_due_date && booking.balance_due_date <= today
        ? "balance_due"
        : "confirmed";
  const { data: confirmedRows, error: confirmError } = await admin
    .from("catering_bookings")
    .update({
      status,
      deposit_paid_at: paidAt,
      hold_expires_at: null,
      ...(status === "paid_in_full" ? { balance_paid_at: paidAt } : {}),
    })
    .eq("id", booking.id)
    .in("status", ["awaiting_deposit", "expired"])
    .select("id");
  if (confirmError) throw new Error(`Confirming catering booking failed: ${confirmError.message}`);
  if (!confirmedRows?.length) {
    // The owner cancelled in the moment between: give the money back.
    await refund(pi, payment.id);
    await admin.from("catering_payments").update({ status: "refunded" }).eq("id", payment.id);
    return;
  }

  const q = readQuote(booking);
  const confirmed = { ...booking, status } as Booking;
  await notify({
    to: { name: booking.host_name, email: booking.host_email },
    template: "catering_booked_host",
    data: {
      businessName: business,
      ownerEmail: owner.email,
      when,
      guests: booking.guest_count,
      packageName: q?.packageName ?? "Catering",
      total: formatCents(booking.total_cents),
      paid: formatCents(payment.amount_cents),
      balanceLine:
        booking.balance_cents > 0 && booking.balance_due_date
          ? `${formatCents(booking.balance_cents)} due ${formatEventDate(booking.balance_due_date)}`
          : null,
      statusUrl: bookingStatusUrl(booking.public_token),
      calendar: bookingCalendar(confirmed, business),
      agreement: signedAgreement(booking),
    },
  });
  await notify({
    to: { email: owner.email },
    template: "catering_booked_owner",
    data: {
      hostName: booking.host_name,
      when,
      guests: booking.guest_count,
      packageName: q?.packageName ?? "Catering",
      total: formatCents(booking.total_cents),
      paid: formatCents(payment.amount_cents),
      bookingUrl: bookingAdminUrl(booking.id),
      agreement: signedAgreement(booking),
      // After the first (free) booking, the page needs a live subscription to take more.
      cardNote: canSendPayLinks(owner.subscription_status)
        ? null
        : `Keep the bookings coming: your quote page takes its next booking once you add your card (cancel anytime): ${appUrl()}/dashboard/billing`,
    },
  });
}

/** checkout.session.expired: that attempt is over. The hold ends on its own (cron marks it expired). */
export async function handleCateringCheckoutExpired(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const paymentId = session.metadata?.payment_id;
  if (!paymentId) return;
  await createAdminClient()
    .from("catering_payments")
    .update({ status: "failed" })
    .eq("id", paymentId)
    .eq("status", "pending");
}

/** charge.refunded: record refunds made in the Stripe dashboard (owners refund there). */
export async function handleCateringChargeRefunded(paymentIntentId: string): Promise<void> {
  await createAdminClient()
    .from("catering_payments")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .neq("status", "refunded");
}

/** The agreement as signed, with the signature block, or undefined for older bookings. */
export function signedAgreement(
  b: Pick<Booking, "contract_text" | "signature_name" | "signed_at" | "signer_ip">,
): string | undefined {
  if (!b.contract_text || !b.signature_name || !b.signed_at) return undefined;
  return `${b.contract_text}\n\n${signatureBlock({ signatureName: b.signature_name, signedAt: b.signed_at, ip: b.signer_ip })}`;
}

async function paidPayments(bookingId: string): Promise<(PaidPayment & { pi: string | null })[]> {
  const { data } = await createAdminClient()
    .from("catering_payments")
    .select("id, kind, amount_cents, stripe_payment_intent_id")
    .eq("booking_id", bookingId)
    .eq("status", "paid");
  return (data ?? []).map((p) => ({
    id: p.id,
    kind: p.kind,
    amount_cents: p.amount_cents,
    pi: p.stripe_payment_intent_id,
  }));
}

/**
 * Refunds whole payments. A cancellation by the host or owner keeps the processing
 * fee, like Dibs deposits (Stripe keeps its fee too). Each is marked as it goes, so
 * a retry after a failure skips the ones already refunded.
 */
async function refundPayments(payments: (PaidPayment & { pi: string | null })[]): Promise<void> {
  const admin = createAdminClient();
  for (const p of payments) {
    if (!p.pi) throw new Error(`Catering payment ${p.id} has no payment intent`);
    await getStripe().refunds.create(
      { payment_intent: p.pi, reverse_transfer: true, refund_application_fee: false },
      { idempotencyKey: `catering-cancel-refund-${p.id}` },
    );
    const { error } = await admin
      .from("catering_payments")
      .update({ status: "refunded" })
      .eq("id", p.id)
      .eq("status", "paid");
    if (error) throw new Error(`Recording refund failed: ${error.message}`);
  }
}

/** The owner cancels: refund everything the host paid, then cancel. Returns the cents refunded. */
export async function ownerCancelRefund(bookingId: string): Promise<number> {
  await expireOpenCateringCheckouts(bookingId);
  const payments = await paidPayments(bookingId);
  const plan = ownerCancelPlan(payments);
  await refundPayments(payments.filter((p) => plan.refund.some((r) => r.id === p.id)));
  return plan.refundCents;
}

/** What a host would get back if they cancelled now, or null if they can't cancel online. */
export async function hostCancelQuote(booking: Booking): Promise<RefundPlan | null> {
  if (!(["confirmed", "balance_due", "paid_in_full"] as string[]).includes(booking.status))
    return null;
  return hostCancelPlan(booking, await paidPayments(booking.id), todayIn(booking.timezone));
}

/**
 * The host cancels from their booking page. The server decides the refund now and
 * refuses if the page showed a different amount.
 */
export async function hostCancelBooking(token: string, shownRefundCents: number): Promise<void> {
  const loaded = await loadByToken(token);
  if (!loaded) throw new CateringError("expired", "We couldn't find this booking.");
  const { booking, owner } = loaded;
  const payments = await paidPayments(booking.id);
  const plan = (["confirmed", "balance_due", "paid_in_full"] as string[]).includes(booking.status)
    ? hostCancelPlan(booking, payments, todayIn(booking.timezone))
    : null;
  if (!plan)
    throw new CateringError(
      "invalid",
      "This event can't be cancelled online. Contact the caterer.",
    );
  if (plan.refundCents !== shownRefundCents)
    throw new CateringError(
      "price_changed",
      "The refund for cancelling has changed. Check the new amount and try again.",
    );

  await expireOpenCateringCheckouts(booking.id);
  await refundPayments(payments.filter((p) => plan.refund.some((r) => r.id === p.id)));
  const admin = createAdminClient();
  const { data: cancelled, error } = await admin
    .from("catering_bookings")
    .update({ status: "cancelled", cancelled_by: "host", cancelled_at: new Date().toISOString() })
    .eq("id", booking.id)
    .in("status", ["confirmed", "balance_due", "paid_in_full"])
    .select("id");
  if (error) throw new Error(`Cancelling catering booking failed: ${error.message}`);
  if (!cancelled?.length) return;

  const business = owner.business_name ?? "your caterer";
  const when = bookingWhen(booking);
  const refund = plan.refundCents > 0 ? formatCents(plan.refundCents) : null;
  const kept = plan.keptCents > 0 ? formatCents(plan.keptCents) : null;
  await notify({
    to: { name: booking.host_name, email: booking.host_email },
    template: "catering_host_cancelled_host",
    data: { businessName: business, ownerEmail: owner.email, when, refund, kept },
  });
  await notify({
    to: { email: owner.email },
    template: "catering_host_cancelled_owner",
    data: {
      hostName: booking.host_name,
      when,
      refund,
      kept,
      bookingUrl: bookingAdminUrl(booking.id),
    },
  });
}
