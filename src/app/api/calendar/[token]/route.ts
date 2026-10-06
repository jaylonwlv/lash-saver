import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { appointmentUrl, calendarUid, payability } from "@/lib/appointments";
import { buildCalendar, type CalendarEvent } from "@/lib/calendar";
import { APP_NAME } from "@/lib/config";
import { formatCents } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";

/** How far back the feed goes; older appointments drop off the calendar. */
const PAST_DAYS = 60;

const notFound = () => new NextResponse("Not found", { status: 404 });

/**
 * A pro's private calendar feed (/api/calendar/<token>.ics), subscribed to from
 * Apple Calendar or Google Calendar. Calendar apps can't sign in, so the random
 * token in the URL is the key; the pro can reset it from Appointments.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/calendar/[token]">,
) {
  const token = z.uuid().safeParse((await params).token.replace(/\.ics$/i, ""));
  if (!token.success) return notFound();

  const admin = createAdminClient();
  const { data: tech } = await admin
    .from("profiles")
    .select("id, business_name")
    .eq("calendar_token", token.data)
    .maybeSingle();
  if (!tech) return notFound();

  const since = new Date(Date.now() - PAST_DAYS * 86_400_000).toISOString();
  const [{ data: rows, error }, { data: services }] = await Promise.all([
    admin
      .from("appointments")
      .select(
        "id, client_name, client_email, client_phone, client_instagram, notes, starts_at, ends_at, status, hold_expires_at, client_marked_sent_at, deposit_cents, price_cents, service_id",
      )
      .eq("tech_id", tech.id)
      .gte("starts_at", since)
      .in("status", ["confirmed", "completed", "no_show", "pending_deposit"])
      .order("starts_at")
      .limit(1000),
    admin.from("services").select("id, name").eq("tech_id", tech.id),
  ]);
  if (error) {
    console.error("Calendar feed failed", error);
    return new NextResponse("Try again later", { status: 503 });
  }
  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));

  const events: CalendarEvent[] = [];
  for (const a of rows) {
    // A pay link nobody paid (and nobody says they paid) isn't holding the time.
    const waiting = a.status === "pending_deposit";
    if (waiting && !a.client_marked_sent_at && payability(a) !== "ok") continue;
    const service = (a.service_id && serviceName.get(a.service_id)) ?? "Appointment";
    const prefix = waiting ? "Waiting for deposit: " : a.status === "no_show" ? "No-show: " : "";
    const details = [
      service,
      a.deposit_cents
        ? `Deposit ${formatCents(a.deposit_cents)}` +
          (a.price_cents ? ` of ${formatCents(a.price_cents)}` : "") +
          (!waiting ? "" : a.client_marked_sent_at ? " (client says it's sent)" : " (not paid yet)")
        : null,
      a.client_phone,
      a.client_email,
      a.client_instagram ? `@${a.client_instagram}` : null,
      a.notes ? `Notes: ${a.notes}` : null,
      appointmentUrl(a.id),
    ].filter(Boolean);
    events.push({
      uid: calendarUid(a.id),
      start: new Date(a.starts_at),
      end: new Date(a.ends_at),
      summary: `${prefix}${a.client_name} · ${service}`,
      description: details.join("\n"),
      url: appointmentUrl(a.id),
      status: waiting ? "TENTATIVE" : "CONFIRMED",
    });
  }

  const calendar = buildCalendar(events, {
    name: tech.business_name ? `${tech.business_name} (${APP_NAME})` : APP_NAME,
    refreshMinutes: 15,
  });
  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="appointments.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
