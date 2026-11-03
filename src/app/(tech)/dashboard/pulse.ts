import "server-only";
import { payability } from "@/lib/appointments";
import { formatCents } from "@/lib/money";
import type { createClient } from "@/lib/supabase/server";
import { formatDate, wallClockParts } from "@/lib/time";
import type { Task } from "./home";

/*
 * The dashboard's snapshot: what needs the pro, what's next and what's waiting.
 * Same rules as the Appointments list (needs action, upcoming, waiting).
 */

export type Pulse = {
  tasks: Task[];
  moreTasks: number;
  upcoming: number;
  waiting: number;
  next: {
    href: string;
    client: string;
    service: string;
    day: string;
    time: string;
    deposit: string;
  } | null;
};

const SHOWN_TASKS = 3;

export async function loadPulse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  techId: string,
  timeZone: string,
  now = new Date(),
): Promise<Pulse> {
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const [{ data: rows, error }, { data: owed }, { data: services }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, client_name, starts_at, status, hold_expires_at, service_id, client_marked_sent_at, deposit_cents",
      )
      .eq("tech_id", techId)
      .gte("starts_at", since)
      .order("starts_at"),
    supabase
      .from("deposits")
      .select("appointment_id, amount_cents")
      .eq("tech_id", techId)
      .eq("status", "refund_due"),
    supabase.from("services").select("id, name").eq("tech_id", techId),
  ]);
  if (error) throw new Error(`Loading appointments failed: ${error.message}`);

  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));
  const refundFor = new Map((owed ?? []).map((d) => [d.appointment_id, d.amount_cents]));
  const first = (name: string) => name.split(" ")[0];
  const started = (startsAt: string) => new Date(startsAt) <= now;
  const href = (id: string) => `/dashboard/appointments/${id}`;

  const toConfirm = rows.filter((r) => r.status === "pending_deposit" && r.client_marked_sent_at);
  const tasks: Task[] = [
    ...toConfirm.map((r) => ({
      href: href(r.id),
      emoji: "💸",
      title: `${first(r.client_name)} says they sent ${formatCents(r.deposit_cents ?? 0)}`,
      detail: "Check your app, then tap Received",
    })),
    ...rows
      .filter((r) => refundFor.has(r.id))
      .map((r) => ({
        href: href(r.id),
        emoji: "↩️",
        title: `Send ${first(r.client_name)} their ${formatCents(refundFor.get(r.id) ?? 0)} refund`,
        detail: "Then tap I sent the refund",
      })),
    ...rows
      .filter((r) => r.status === "confirmed" && started(r.starts_at))
      .map((r) => ({
        href: href(r.id),
        emoji: "👀",
        title: `Did ${first(r.client_name)} show up?`,
        detail: `${serviceName.get(r.service_id ?? "") ?? "Appointment"} · ${formatDate(r.starts_at, timeZone)}`,
      })),
  ];

  const upcoming = rows.filter((r) => r.status === "confirmed" && !started(r.starts_at));
  const waiting = rows.filter((r) => payability(r, now) === "ok" && !r.client_marked_sent_at);
  const n = upcoming[0];

  return {
    tasks: tasks.slice(0, SHOWN_TASKS),
    moreTasks: Math.max(0, tasks.length - SHOWN_TASKS),
    upcoming: upcoming.length,
    waiting: waiting.length,
    next: n
      ? {
          href: href(n.id),
          client: n.client_name,
          service: serviceName.get(n.service_id ?? "") ?? "Appointment",
          day: dayLabel(new Date(n.starts_at), timeZone, now),
          time: new Intl.DateTimeFormat("en-US", {
            timeZone,
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(n.starts_at)),
          deposit: formatCents(n.deposit_cents ?? 0),
        }
      : null,
  };
}

/** "Today", "Tomorrow", or the weekday and date ("Sat 11/8"), on the pro's clock. */
function dayLabel(date: Date, timeZone: string, now: Date): string {
  const day = wallClockParts(date, timeZone).date;
  if (day === wallClockParts(now, timeZone).date) return "Today";
  if (day === wallClockParts(new Date(now.getTime() + 86_400_000), timeZone).date)
    return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "numeric",
    day: "numeric",
  }).format(date);
}
