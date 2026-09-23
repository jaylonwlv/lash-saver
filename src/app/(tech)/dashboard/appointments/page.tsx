import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { ButtonLink } from "@/components/ui/button";
import { STATUS_LABEL, payability } from "@/lib/appointments";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatWhen } from "@/lib/time";

export const metadata: Metadata = { title: "Appointments" };

const PAST_DAYS = 30;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

type Row = Pick<
  Tables<"appointments">,
  "id" | "client_name" | "starts_at" | "status" | "hold_expires_at" | "service_id"
>;

export default async function AppointmentsPage() {
  const user = await getUser();
  const supabase = await createClient();
  const since = daysAgo(PAST_DAYS).toISOString();

  const [{ data: profile }, { data: rows, error }, { data: services }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user!.id).single(),
    supabase
      .from("appointments")
      .select("id, client_name, starts_at, status, hold_expires_at, service_id")
      .eq("tech_id", user!.id)
      .gte("starts_at", since)
      .order("starts_at"),
    supabase.from("services").select("id, name").eq("tech_id", user!.id),
  ]);
  if (error || !profile) throw new Error(`Loading appointments failed: ${error?.message}`);

  const tz = profile.timezone;
  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));
  const now = new Date();
  const started = (r: Row) => new Date(r.starts_at) <= now;

  const needsAction = rows.filter((r) => r.status === "confirmed" && started(r));
  const upcoming = rows.filter((r) => r.status === "confirmed" && !started(r));
  const waiting = rows.filter((r) => payability(r, now) === "ok");
  const past = rows
    .filter((r) => !needsAction.includes(r) && !upcoming.includes(r) && !waiting.includes(r))
    .reverse();

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard" label="Dashboard" />
      <h1 className="text-2xl font-bold">Appointments</h1>
      <ButtonLink href="/dashboard/appointments/new">New appointment</ButtonLink>

      {rows.length === 0 && (
        <p className="text-muted">
          No appointments yet. When a client books in your DMs, create one here and send them the
          pay link.
        </p>
      )}

      <Section
        title="Did they show up?"
        hint="Mark each one so the deposit is applied or kept."
        rows={needsAction}
        tz={tz}
        serviceName={serviceName}
      />
      <Section title="Upcoming" rows={upcoming} tz={tz} serviceName={serviceName} />
      <Section title="Waiting for deposit" rows={waiting} tz={tz} serviceName={serviceName} />
      <Section title={`Past ${PAST_DAYS} days`} rows={past} tz={tz} serviceName={serviceName} />
    </div>
  );
}

function Section({
  title,
  hint,
  rows,
  tz,
  serviceName,
}: {
  title: string;
  hint?: string;
  rows: Row[];
  tz: string;
  serviceName: Map<string, string>;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-muted text-sm">{hint}</p>}
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/dashboard/appointments/${r.id}`}
              className="border-line bg-surface active:bg-background flex min-h-12 flex-col gap-1 rounded-2xl border p-4"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-medium">{r.client_name}</span>
                <span className="text-muted text-xs font-medium">
                  {r.status === "pending_deposit" && payability(r) !== "ok"
                    ? STATUS_LABEL.expired
                    : STATUS_LABEL[r.status]}
                </span>
              </span>
              <span className="text-muted text-sm">
                {(r.service_id && serviceName.get(r.service_id)) ?? "Appointment"} ·{" "}
                {formatWhen(r.starts_at, tz)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
