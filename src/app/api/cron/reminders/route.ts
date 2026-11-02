import { NextResponse, type NextRequest } from "next/server";
import { cancelNote, loadAppointmentContext, payUrl } from "@/lib/appointments";
import {
  depositAnnouncement,
  FIRST_LINK_FOLLOWUP_AFTER_HOURS,
  FIRST_LINK_FOLLOWUP_STOP_AFTER_DAYS,
  FOUNDER_CHECKIN_AFTER_DAYS,
  FOUNDER_CHECKIN_STOP_AFTER_DAYS,
  REMINDER_OFFSETS_HOURS,
  SETUP_NUDGE_FIRST_AFTER_HOURS,
  SETUP_NUDGE_NEXT_AFTER_HOURS,
  SETUP_NUDGE_STOP_AFTER_DAYS,
  SUBSCRIPTION_PRICE_CENTS,
  TRIAL_ENDING_NOTICE_DAYS,
} from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { formatCents } from "@/lib/money";
import { serverEnv } from "@/lib/env";
import {
  alreadyLogged,
  notifyForAppointment,
  notifyMarketingOnce,
  notifyOnce,
} from "@/lib/notifications/log";
import { loadSavings, savingsSummary } from "@/lib/savings";
import { nextStepSentence, setupState } from "@/lib/setup";
import { freeUntil, trialOffer } from "@/lib/stripe/billing";
import { DRIP_SCHEDULE, dripEmail, dueDripStep, type DripStep } from "@/lib/drip";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatWhen } from "@/lib/time";
import { dueReminder, reminderLogKey } from "./reminders";
import { cateringJobs } from "./catering-due";
import { addDays, formatEventDate, todayIn } from "@/lib/catering/dates";
import { bookingAdminUrl, bookingStatusUrl, bookingWhen, readQuote } from "@/lib/catering/server";

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
  const firstLinkFollowups = await sendFirstLinkFollowups(now);
  // Never let catering stop the appointment reminders above.
  const nurture = await sendNurtureDrip(now).catch((err: unknown) => {
    console.error("Nurture drip failed", err);
    return { error: 1 };
  });
  const catering = await runCateringJobs(now).catch((err: unknown) => {
    console.error("Catering cron jobs failed", err);
    return { error: 1 };
  });
  return NextResponse.json({
    ok: true,
    expired: expired?.length ?? 0,
    ...reminders,
    trialNotices,
    setupNudges,
    founderCheckins,
    firstLinkFollowups,
    catering,
    nurture,
  });
}

/**
 * The nurture drip (lib/drip.ts) for pros who sent a first pay link but haven't added a
 * card: tips at days 4, 9, 16 and 24, one step per run. Marketing email, so it needs the
 * postal address and skips anyone who unsubscribed. Stops once they have a subscription.
 */
async function sendNurtureDrip(now: Date): Promise<Record<string, number | string>> {
  if (!serverEnv().MAIL_POSTAL_ADDRESS) return { skipped: "MAIL_POSTAL_ADDRESS not set" };
  const admin = createAdminClient();
  const since = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  const { data: techs, error } = await admin
    .from("profiles")
    .select("id, email, trade, business_name, cancellation_window_hours")
    .is("subscription_id", null)
    .is("subscription_status", null)
    .is("marketing_opt_out_at", null)
    .gte("created_at", since)
    .limit(2000);
  if (error) throw new Error(`Loading pros for the drip failed: ${error.message}`);

  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  let sent = 0;
  for (const tech of techs) {
    try {
      const { data: first } = await admin
        .from("appointments")
        .select("created_at")
        .eq("tech_id", tech.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (!first) continue; // No pay link yet: the setup reminders cover them.

      const keys = DRIP_SCHEDULE.map(({ step }) => `nurture_${step}:${tech.id}`);
      const { data: logged } = await admin
        .from("notification_log")
        .select("template, created_at")
        .in("template", keys)
        .is("error", null);
      const sentAt: Partial<Record<DripStep, Date>> = {};
      for (const row of logged ?? []) {
        const step = row.template.slice("nurture_".length).split(":")[0] as DripStep;
        sentAt[step] = new Date(row.created_at);
      }
      const step = dueDripStep(new Date(first.created_at), now, sentAt);
      if (!step) continue;

      // Unknown trial eligibility: try again tomorrow rather than promise (or deny) a trial.
      const offer = await trialOffer(tech.id, now).catch(() => undefined);
      if (offer === undefined) continue;
      const [{ data: top }, { count: depositsPaid }] = await Promise.all([
        admin
          .from("services")
          .select("name, price_cents")
          .eq("tech_id", tech.id)
          .eq("is_active", true)
          // Their own prices only, never the starter menu's examples.
          .eq("is_starter", false)
          .order("price_cents", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("deposits")
          .select("id", { count: "exact", head: true })
          .eq("tech_id", tech.id)
          .in("status", ["paid", "applied", "forfeited"]),
      ]);
      const monthly = formatCents(SUBSCRIPTION_PRICE_CENTS).replace(/\.00$/, "");
      const email = dripEmail({
        step,
        trade: tech.trade,
        businessName: tech.business_name,
        windowHours: tech.cancellation_window_hours,
        announcement: depositAnnouncement(tech.cancellation_window_hours),
        freeUntil: offer?.until ?? null,
        monthly,
        monthlyCents: SUBSCRIPTION_PRICE_CENTS,
        topService: top
          ? {
              name: top.name,
              price: formatCents(top.price_cents).replace(/\.00$/, ""),
              priceCents: top.price_cents,
            }
          : null,
        depositsPaid: depositsPaid ?? 0,
        billingUrl: `${appUrl}/dashboard/billing`,
        profileUrl: `${appUrl}/dashboard/profile`,
        newAppointmentUrl: `${appUrl}/dashboard/appointments/new`,
      });
      const ok = await notifyMarketingOnce(`nurture_${step}:${tech.id}`, tech.id, {
        to: { email: tech.email },
        template: "nurture",
        data: email,
      });
      if (ok) sent++;
    } catch (err) {
      console.error(`Nurture drip for ${tech.id} failed`, err);
    }
  }
  return { sent };
}

/**
 * Catering: expire unpaid holds, move bookings to balance_due, balance reminders
 * (7 and 2 days before it's due), an overdue notice to the owner, the owner's
 * day-before summary, and completing past events. Each message is sent once
 * (notification_log key "<template>:<booking id>").
 */
async function runCateringJobs(now: Date): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const counts: Record<string, number> = { expired: 0, sent: 0, completed: 0 };

  const { data: lapsed, error: expireError } = await admin
    .from("catering_bookings")
    .update({ status: "expired" })
    .in("status", ["awaiting_deposit", "requested"])
    .lt("hold_expires_at", now.toISOString())
    .select("id");
  if (expireError) throw new Error(`Expiring catering holds failed: ${expireError.message}`);
  counts.expired = lapsed?.length ?? 0;

  // Everything that holds a date within reach of a reminder (balance due up to 90
  // days before the event, reminded 7 days before that), plus past ones to complete.
  const horizon = addDays(now.toISOString().slice(0, 10), 100);
  const { data: bookings, error } = await admin
    .from("catering_bookings")
    .select("*")
    .in("status", ["confirmed", "balance_due", "paid_in_full"])
    .lte("event_date", horizon)
    .limit(5000);
  if (error) throw new Error(`Loading catering bookings failed: ${error.message}`);

  const owners = new Map<string, { business_name: string | null; email: string } | null>();
  const ownerOf = async (id: string) => {
    if (!owners.has(id)) {
      const { data } = await admin
        .from("profiles")
        .select("business_name, email")
        .eq("id", id)
        .maybeSingle();
      owners.set(id, data);
    }
    return owners.get(id) ?? null;
  };

  for (const b of bookings) {
    try {
      const today = todayIn(b.timezone, now);
      const jobs = cateringJobs(
        {
          ...b,
          deposit_paid_date: b.deposit_paid_at
            ? todayIn(b.timezone, new Date(b.deposit_paid_at))
            : null,
        },
        today,
      );
      if (jobs.length === 0) continue;
      const owner = await ownerOf(b.tech_id);
      if (!owner) continue;
      const business = owner.business_name ?? "Your caterer";
      const when = bookingWhen(b);
      const balance = formatCents(b.balance_cents);
      const dueDate = b.balance_due_date ? formatEventDate(b.balance_due_date) : "";
      const send = async <T extends Parameters<typeof notifyOnce>[1]>(key: string, input: T) => {
        const logKey = `${key}:${b.id}`;
        if (await alreadyLogged(logKey)) return;
        if (await notifyOnce(logKey, input)) counts.sent++;
      };

      for (const job of jobs) {
        switch (job) {
          case "mark_completed":
            await admin
              .from("catering_bookings")
              .update({ status: "completed" })
              .eq("id", b.id)
              .eq("status", b.status);
            counts.completed++;
            break;
          case "mark_balance_due":
            await admin
              .from("catering_bookings")
              .update({ status: "balance_due" })
              .eq("id", b.id)
              .eq("status", "confirmed");
            break;
          case "balance_reminder_7d":
          case "balance_reminder_2d":
            await send(`catering_${job}`, {
              to: { name: b.host_name, email: b.host_email },
              template: "catering_balance_reminder",
              data: {
                businessName: business,
                ownerEmail: owner.email,
                when,
                balance,
                dueDate,
                payUrl: bookingStatusUrl(b.public_token),
              },
            });
            break;
          case "balance_overdue":
            await send("catering_balance_overdue", {
              to: { email: owner.email },
              template: "catering_balance_overdue",
              data: {
                hostName: b.host_name,
                when,
                balance,
                dueDate,
                bookingUrl: bookingAdminUrl(b.id),
              },
            });
            break;
          case "day_before": {
            const q = readQuote(b);
            await send("catering_day_before", {
              to: { email: owner.email },
              template: "catering_day_before",
              data: {
                when,
                hostName: b.host_name,
                hostPhone: b.host_phone,
                address: b.event_address,
                guests: b.guest_count,
                packageName: q?.packageName ?? "Catering",
                addOns: q?.addOnNames.length ? q.addOnNames.join(", ") : null,
                notes: b.event_notes,
                bookingUrl: bookingAdminUrl(b.id),
              },
            });
            break;
          }
        }
      }
    } catch (err) {
      console.error(`Catering jobs for ${b.id} failed`, err);
    }
  }
  return counts;
}

/**
 * About a day after a pro's first pay link (which needs no card), if they still haven't
 * added one: "your next pay link needs your card". Once per pro. Without it they'd hear
 * nothing until they hit the trial card on their second link.
 */
async function sendFirstLinkFollowups(now: Date): Promise<number> {
  const admin = createAdminClient();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  // Paged: Supabase returns at most 1000 rows per request, and every pro's pay links
  // from the past week land here, not only first ones.
  const techIds = new Set<string>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data: links, error } = await admin
      .from("appointments")
      .select("tech_id")
      .lte("created_at", hoursAgo(FIRST_LINK_FOLLOWUP_AFTER_HOURS))
      .gt("created_at", hoursAgo(FIRST_LINK_FOLLOWUP_STOP_AFTER_DAYS * 24))
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Loading first pay links failed: ${error.message}`);
    for (const l of links) techIds.add(l.tech_id);
    if (links.length < PAGE) break;
  }

  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  let sent = 0;
  for (const techId of techIds) {
    // One bad profile must not stop the rest.
    try {
      const logKey = `first_link_followup:${techId}`;
      if (await alreadyLogged(logKey)) continue;
      const { data: tech, error: techError } = await admin
        .from("profiles")
        .select("email, subscription_id, subscription_status")
        .eq("id", techId)
        .single();
      if (techError) throw new Error(techError.message);
      // Already added a card (trial or paid, or had one before): nothing to say.
      if (tech.subscription_id || tech.subscription_status) continue;
      // Unknown: try again tomorrow rather than promise (or rule out) a trial.
      const until = await freeUntil(techId).catch(() => undefined);
      if (until === undefined) continue;
      const ok = await notifyMarketingOnce(logKey, techId, {
        to: { email: tech.email },
        template: "first_link_followup",
        data: {
          freeUntil: until,
          price: formatCents(SUBSCRIPTION_PRICE_CENTS).replace(/\.00$/, ""),
          billingUrl: `${appUrl}/dashboard/billing`,
        },
      });
      if (ok) sent++;
    } catch (err) {
      console.error(`First pay link follow-up for ${techId} failed`, err);
    }
  }
  return sent;
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
 * The founder's one check-in, 7–10 days after sign-up, for pros who haven't sent a
 * pay link: answers to what usually holds people up, each with a link. Sent once.
 */
async function sendFounderCheckins(now: Date): Promise<number> {
  const admin = createAdminClient();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
  const { data: techs, error } = await admin
    .from("profiles")
    .select("id, email, cancellation_window_hours")
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
      const ok = await notifyMarketingOnce(logKey, tech.id, {
        to: { email: tech.email },
        template: "founder_checkin",
        data: {
          appUrl: publicEnv().NEXT_PUBLIC_APP_URL,
          announcement: depositAnnouncement(tech.cancellation_window_hours),
          // Only promise a trial they can get.
          freeUntil: await freeUntil(tech.id).catch(() => null),
          price: formatCents(SUBSCRIPTION_PRICE_CENTS).replace(".00", ""),
        },
      });
      if (ok) sent++;
    } catch (err) {
      console.error(`Founder check-in for ${tech.id} failed`, err);
    }
  }
  return sent;
}

/**
 * Remind pros who signed up but haven't added a card (so can't send pay links yet):
 * one email about a day after sign-up and one about three days after, each sent once.
 * Most pros finish setup on day one but have no client to book until later; these
 * bring them back for that first pay link.
 */
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
      // They've sent their first pay link (it needs no card): these are about that one.
      const { count: payLinks, error: linksError } = await admin
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("tech_id", tech.id);
      if (linksError) throw new Error(linksError.message);
      if ((payLinks ?? 0) > 0) continue;

      const { count, error: servicesError } = await admin
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("tech_id", tech.id)
        .eq("is_active", true);
      if (servicesError) throw new Error(servicesError.message);
      // Leave the trial out rather than promise one they can't get.
      const until = await freeUntil(tech.id).catch(() => null);

      const data = {
        nextStep: nextStepSentence(setupState(tech, count ?? 0)),
        freeUntil: until,
        dashboardUrl: `${publicEnv().NEXT_PUBLIC_APP_URL}/dashboard`,
      };
      const ok = await notifyMarketingOnce(logKey, tech.id, {
        to: { email: tech.email },
        template,
        data,
      });
      if (ok) sent++;
    } catch (err) {
      console.error(`Setup reminder for ${tech.id} failed`, err);
    }
  }
  return sent;
}
