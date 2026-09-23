import { NextResponse, type NextRequest } from "next/server";
import { cancelNote, loadAppointmentContext, payUrl } from "@/lib/appointments";
import { REMINDER_OFFSETS_HOURS } from "@/lib/config";
import { serverEnv } from "@/lib/env";
import { notifyForAppointment } from "@/lib/notifications/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatWhen } from "@/lib/time";
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
    .lt("hold_expires_at", now.toISOString())
    .select("id");
  if (error) throw new Error(`Expiring pay links failed: ${error.message}`);

  const reminders = await sendReminders(now);
  return NextResponse.json({ ok: true, expired: expired?.length ?? 0, ...reminders });
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
          businessName: ctx.tech.business_name ?? "Your lash tech",
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
