import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { createClient, getUser } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage({ searchParams }: PageProps<"/dashboard/services">) {
  const { starter } = await searchParams;
  const user = await getUser();
  const supabase = await createClient();
  const { data: services, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, deposit_cents, is_active, is_starter")
    .eq("tech_id", user!.id)
    .order("is_active", { ascending: false })
    .order("price_cents");
  if (error) throw new Error(`Loading services failed: ${error.message}`);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard" label="Dashboard" />
      <h1 className="text-2xl font-bold">
        {starter === "1" ? "Your starter menu is ready" : "Services"}
      </h1>
      {services.some((s) => s.is_starter && s.is_active) && (
        <p className="border-brand bg-surface rounded-2xl border-2 p-4 text-sm">
          <strong>These are example prices.</strong> Tap each service to set your own name, price
          and deposit. Hide any you don&apos;t offer. Clients see these on your booking page and pay
          links, so edit them before you send your first link.
        </p>
      )}

      {services.length === 0 ? (
        <p className="text-muted">
          Add the services you offer. Each one has its own price and deposit.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {services.map((s) => (
            <li key={s.id}>
              <Link
                href={`/dashboard/services/${s.id}`}
                className="border-line bg-surface active:bg-background flex min-h-12 flex-col gap-1 rounded-2xl border p-4"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">{s.name}</span>
                  {!s.is_active ? (
                    <span className="text-muted text-xs font-medium">Hidden</span>
                  ) : (
                    s.is_starter && (
                      <span className="bg-brand-soft text-brand shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold">
                        Example price · edit
                      </span>
                    )
                  )}
                </span>
                <span className="text-muted text-sm">
                  {formatDuration(s.duration_minutes)} · {formatCents(s.price_cents)} ·{" "}
                  {formatCents(s.deposit_cents)} deposit
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ButtonLink href="/dashboard/services/new">Add a service</ButtonLink>
    </div>
  );
}
