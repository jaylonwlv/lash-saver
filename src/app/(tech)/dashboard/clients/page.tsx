import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { clientRecord, isFlaky, loadClients } from "@/lib/clients";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const user = await getUser();
  const supabase = await createClient();
  const [{ data: profile }, clients] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user!.id).single(),
    loadClients(supabase, user!.id),
  ]);
  const timezone = profile?.timezone ?? "America/Chicago";
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard" label="Dashboard" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-muted text-sm">
          Everyone you&apos;ve sent a pay link to, with their record. Built from your appointments,
          so there&apos;s nothing to add.
        </p>
      </div>

      {clients.length === 0 ? (
        <p className="border-line bg-surface text-muted rounded-2xl border p-5">
          Your clients show up here after you create their first appointment.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {clients.map((c) => (
            <li key={c.key}>
              <Link
                href={`/dashboard/clients/${encodeURIComponent(c.key)}`}
                className="border-line bg-surface active:bg-background flex min-h-12 flex-col gap-1 rounded-2xl border p-4"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">{c.name}</span>
                  {isFlaky(c) && (
                    <span className="bg-danger/10 text-danger shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold">
                      {c.noShows + c.lateCancels} missed
                    </span>
                  )}
                </span>
                <span className="text-muted text-sm">{clientRecord(c)}</span>
                {c.lastAt && (
                  <span className="text-muted text-xs">
                    {new Date(c.lastAt) > now ? "Next" : "Last"} appointment{" "}
                    {formatDate(c.lastAt, timezone)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
