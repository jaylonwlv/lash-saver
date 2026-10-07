import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { ButtonLink } from "@/components/ui/button";
import { STATUS_LABEL } from "@/lib/appointments";
import {
  clientMatcher,
  clientRecord,
  isFlaky,
  loadClientAppointments,
  summarizeClients,
} from "@/lib/clients";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatWhen } from "@/lib/time";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: PageProps<"/dashboard/clients/[key]">) {
  const raw = (await params).key;
  // Next may hand us the segment already decoded; decoding again must not throw.
  let key = raw;
  try {
    key = decodeURIComponent(raw);
  } catch {}
  const user = await getUser();
  const supabase = await createClient();
  const [{ data: profile }, { appointments, forfeited }, { data: services }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user!.id).single(),
    loadClientAppointments(supabase, user!.id),
    supabase.from("services").select("id, name").eq("tech_id", user!.id),
  ]);
  // Old phone links ("p:…") still open the client once their email is known.
  const { keyOf, resolve } = clientMatcher(appointments);
  const canonical = resolve(key);
  const theirs = appointments.filter((a) => keyOf(a) === canonical);
  const client = summarizeClients(theirs, forfeited)[0];
  if (!client) notFound();
  const timezone = profile?.timezone ?? "America/Chicago";
  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/clients" label="Clients" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <p className="text-muted text-sm">{clientRecord(client)}</p>
        <p className="text-muted text-sm">
          {[client.email, client.instagram && `@${client.instagram}`, client.phone]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {isFlaky(client) && (
        <p className="border-danger bg-surface rounded-2xl border p-4 text-sm">
          <strong>
            {client.name} has missed {client.noShows + client.lateCancels} appointment
            {client.noShows + client.lateCancels === 1 ? "" : "s"}.
          </strong>{" "}
          Next time, consider a bigger deposit or asking for the full price up front. You can change
          the deposit when you create their pay link.
        </p>
      )}

      <ButtonLink href={`/dashboard/appointments/new?client=${encodeURIComponent(client.key)}`}>
        Book {client.name.split(" ")[0]} again
      </ButtonLink>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Appointments</h2>
        <ul className="flex flex-col gap-3">
          {theirs.map((a) => (
            <li key={a.id}>
              <Link
                href={`/dashboard/appointments/${a.id}`}
                className="border-line bg-surface active:bg-background flex min-h-12 flex-col gap-1 rounded-2xl border p-4"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">
                    {(a.service_id && serviceName.get(a.service_id)) ?? "Appointment"}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      a.status === "no_show" ? "text-danger" : "text-muted"
                    }`}
                  >
                    {a.status === "cancelled_by_client" && forfeited.has(a.id)
                      ? "Late cancel, deposit kept"
                      : STATUS_LABEL[a.status]}
                  </span>
                </span>
                <span className="text-muted text-sm">{formatWhen(a.starts_at, timezone)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
