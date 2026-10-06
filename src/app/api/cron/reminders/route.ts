import { NextResponse, type NextRequest } from "next/server";
import { cancelNote, loadAppointmentContext, payUrl } from "@/lib/appointments";
import {
  FOUNDER_CHECKIN_AFTER_DAYS,
  FOUNDER_CHECKIN_STOP_AFTER_DAYS,
  REMINDER_OFFSETS_HOURS,
  SETUP_NUDGE_FIRST_AFTER_HOURS,
  SETUP_NUDGE_NEXT_AFTER_HOURS,
  SETUP_NUDGE_STOP_AFTER_DAYS,
  SUBSCRIPTION_PRICE_CENTS,
  TRIAL_DAYS,
  TRIAL_ENDING_NOTICE_DAYS,
} from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { formatCents } from "@/lib/money";
import { serverEnv } from "@/lib/env";
import { alreadyLogged, notifyForAppointment, notifyOnce } from "@/lib/notifications/log";
import { loadSavings, savingsSummary } from "@/lib/savings";
import { nextStepSentence, setupState } from "@/lib/setup";
import { trialEligible } from "@/lib/stripe/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatWhen } from "@/lib/time";
import { dueReminder, reminderLogKey } from "./reminders";

/**
 * Run by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${serverEnv().CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const admin = createAdminClient();

  // Release pay links nobody paid. The pay page also checks hold_expires_at
  // itself, so this only tidies statuses for the tech's list.
  const { data: expired, error } = await admin
    .from("appointments")
    .update({ status: "expired" })
    .eq("status", "pending_deposit")
    // Client says they sent a Cash App / Zelle / Venmo deposit: wait for the pro.
    .is("client_marked_sent_at", null)
    .lt("hold_expires_at", now.toISOString())
    .select("id");
  if (error) throw new Error(`Expiring pay links failed: ${error.message}`);

  const reminders = await sendReminders(now);
  const trialNotices = await sendTrialEndingNotices(now);
  const setupNudges = await sendSetupNudges(now);
  const founderCheckins = await sendFounderCheckins(now);
  return NextResponse.json({
    ok: true,
    expired: expired?.length ?? 0,
    ...reminders,
    trialNotices,
    setupNudges,
    founderCheckins,
  });
}

async function sendReminders(now: Date) {
  const admin = createAdminClient();
  const horizon = new Date(now.getTime() + Math.max(...REMINDER_OFFSETS_HOURS) * 3_600_000);

  const { data: upcoming, error } = await admin
    .from("appointments")
    .select("id, starts_at")
    .eq("status", "confirmed")
    .gt("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString());
  if (error) throw new Error(`Loading upcoming appointments failed: ${error.message}`);
  if (!upcoming.length) return { reminders: 0, reminderErrors: 0 };

  const ids = upcoming.map((a) => a.id);
  const [{ data: deposits }, { data: sent }] = await Promise.all([
    admin
      .from("deposits")
      .select("appointment_id, paid_at")
      .in("appointment_id", ids)
      .eq("status", "paid"),
    admin
      .from("notification_log")
      .select("appointment_id, template")
      .in("appointment_id", ids)
      .like("template", "appointment_reminder_%")
      .is("error", null),
  ]);
  const paidAt = new Map((deposits ?? []).map((d) => [d.appointment_id, d.paid_at]));
  const alreadySent = new Set((sent ?? []).map((s) => `${s.appointment_id}:${s.template}`));

  let reminders = 0;
  let reminderErrors = 0;
  for (const a of upcoming) {
    const paid = paidAt.get(a.id);
    const due = dueReminder(new Date(a.starts_at), paid ? new Date(paid) : null, now);
    if (due === null) continue;
    const logKey = reminderLogKey(due);
    if (alreadySent.has(`${a.id}:${logKey}`)) continue;

    // One bad appointment must not stop the rest.
    try {
      const ctx = await loadAppointmentContext(a.id);
      if (!ctx) continue;
      await notifyForAppointment({
        appointmentId: a.id,
        to: {
          name: ctx.appointment.client_name,
          email: ctx.appointment.client_email,
          phone: ctx.appointment.client_phone,
        },
        template: "appointment_reminder",
        logAs: logKey,
        data: {
          businessName: ctx.tech.business_name ?? "Your provider",
          serviceName: ctx.serviceName,
          when: formatWhen(ctx.appointment.starts_at, ctx.tech.timezone),
          cancelNote: cancelNote(ctx, now),
          manageUrl: payUrl(a.id),
        },
      });
      reminders++;
    } catch (err) {
      reminderErrors++;
      console.error(`Reminder for appointment ${a.id} failed`, err);
    }
  }
  return { reminders, reminderErrors };
}

/** Tell techs a few days before their trial turns into a paid subscription. Sent once. */
async function sendTrialEndingNotices(now: Date): Promise<number> {
  const admin = createAdminClient();
  const until = new Date(now.getTime() + TRIAL_ENDING_NOTICE_DAYS * 86_400_000);
  const { data: techs, error } = await admin
    .from("profiles")
    .select("id, email, timezone, subscription_id, trial_ends_at")
    .eq("subscription_status", "trialing")
    .eq("cancel_at_period_end", false)
    .gt("trial_ends_at", now.toISOString())
    .lte("trial_ends_at", until.toISOString());
  if (error) throw new Error(`Loading trials failed: ${error.message}`);

  let sent = 0;
  for (const tech of techs) {
    if (!tech.subscription_id || !tech.trial_ends_at) continue;
    const logKey = `trial_ending:${tech.subscription_id}`;
    if (await alreadyLogged(logKey)) continue;

    // What Dibs did for them in the trial; the email still goes out if this fails.
    let savings: string | null = null;
    try {
      const summary = savingsSummary(await loadSavings(admin, tech.id));
      if (summary)
        savings = summary.lines.length
          ? `${summary.headline} so far: ${summary.lines.join("; ")}.`
          : `${summary.headline} so far.`;
    } catch (err) {
      console.error(`Savings for ${tech.id} failed`, err);
    }

    const ok = await notifyOnce(logKey, {
      to: { email: tech.email },
      template: "trial_ending",
      data: {
        endsOn: formatDate(tech.trial_ends_at, tech.timezone),
        amount: formatCents(SUBSCRIPTION_PRICE_CENTS),
        billingUrl: `${publicEnv().NEXT_PUBLIC_APP_URL}/dashboard/billing`,
        savings,
      },
    });
    if (ok) sent++;
  }
  return sent;
}

/**
 * Remind pros who signed up but haven't added a card (so can't send pay links yet):
 * one email about a day after sign-up and one about three days after, each sent once.
 * Most pros finish setup on day one but have no client to book until later; these
 * bring them back for that first pay link.
 */
async function sendFounderCheckins(now: Date): Promise<number> {
  const admin = createAdminClient();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
  const { data: techs, error } = await admin
    .from("profiles")
    .select("id, email")
    .lte("created_at", daysAgo(FOUNDER_CHECKIN_AFTER_DAYS))
    .gt("created_at", daysAgo(FOUNDER_CHECKIN_STOP_AFTER_DAYS));
  if (error) throw new Error(`Loading pros for check-ins failed: ${error.message}`);

  let sent = 0;
  for (const tech of techs) {
    try {
      const logKey = `founder_checkin:${tech.id}`;
      if (await alreadyLogged(logKey)) continue;
      // Only pros who haven't sent a pay link yet.
      const { count, error: countError } = await admin
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("tech_id", tech.id);
      if (countError) throw new Error(countError.message);
      if (count) continue;
      const ok = await notifyOnce(logKey, {
        to: { email: tech.email },
        template: "founder_checkin",
        data: { dashboardUrl: `${publicEnv().NEXT_PUBLIC_APP_URL}/dashboard` },
      });
      if (ok) sent++;
    } catch (err) {
      console.error(`Founder check-in for ${tech.id} failed`, err);
    }
  }
  return sent;
}

async function sendSetupNudges(now: Date): Promise<number> {
  const admin = createAdminClient();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  const { data: techs, error } = await admin
    .from("profiles")
    .select(
      "id, email, created_at, business_name, slug, deposit_method, stripe_charges_enabled, cashapp_tag, zelle_contact, venmo_handle",
    )
    .is("subscription_status", null)
    .is("subscription_id", null)
    .lte("created_at", hoursAgo(SETUP_NUDGE_FIRST_AFTER_HOURS))
    .gt("created_at", hoursAgo(SETUP_NUDGE_STOP_AFTER_DAYS * 24));
  if (error) throw new Error(`Loading pros for setup reminders failed: ${error.message}`);

  let sent = 0;
  for (const tech of techs) {
    // One bad profile must not stop the rest.
    try {
      const ageHours = (now.getTime() - new Date(tech.created_at).getTime()) / 3_600_000;
      const template =
        ageHours < SETUP_NUDGE_NEXT_AFTER_HOURS ? "setup_nudge_first" : "setup_nudge_next_booking";
      const logKey = `${template}:${tech.id}`;
      if (await alreadyLogged(logKey)) continue;

      const { count, error: servicesError } = await admin
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("tech_id", tech.id)
        .eq("is_active", true);
      if (servicesError) throw new Error(servicesError.message);
      // Leave the trial out rather than promise one they can't get.
      const eligible = await trialEligible(tech.id).catch(() => false);

      const data = {
        nextStep: nextStepSentence(setupState(tech, count ?? 0)),
        trialDays: eligible ? TRIAL_DAYS : null,
        dashboardUrl: `${publicEnv().NEXT_PUBLIC_APP_URL}/dashboard`,
      };
      const ok = await notifyOnce(logKey, { to: { email: tech.email }, template, data });
      if (ok) sent++;
    } catch (err) {
      console.error(`Setup reminder for ${tech.id} failed`, err);
    }
  }
  return sent;
}
