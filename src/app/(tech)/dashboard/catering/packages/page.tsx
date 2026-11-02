import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { ButtonLink } from "@/components/ui/button";
import { hoursLabel } from "@/lib/catering/bookings";
import { priceLabel } from "@/lib/catering/quote";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Catering packages" };

export default async function PackagesPage() {
  const user = await getUser();
  const supabase = await createClient();
  const [packages, addOns] = await Promise.all([
    supabase
      .from("catering_packages")
      .select(
        "id, name, pricing_type, price_cents, min_guests, max_guests, included_minutes, is_active",
      )
      .eq("tech_id", user!.id)
      .order("is_active", { ascending: false })
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("catering_addons")
      .select("id, name, pricing_type, price_cents, is_active")
      .eq("tech_id", user!.id)
      .order("is_active", { ascending: false })
      .order("sort_order")
      .order("created_at"),
  ]);
  if (packages.error || addOns.error)
    throw new Error(`Loading packages failed: ${(packages.error ?? addOns.error)?.message}`);

  const row =
    "border-line bg-surface active:bg-background flex min-h-12 flex-col gap-1 rounded-2xl border p-4";
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/catering" label="Catering" />
      <h1 className="font-display text-2xl font-bold">Packages</h1>
      <p className="text-muted text-sm">
        Hosts pick one package, then any add-ons. Your page shows the price for their guest count
        right away.
      </p>
      <ul className="flex flex-col gap-3">
        {packages.data.map((p) => (
          <li key={p.id}>
            <Link href={`/dashboard/catering/packages/${p.id}`} className={row}>
              <span className="flex items-center justify-between gap-3">
                <span className="font-medium">{p.name}</span>
                {!p.is_active && <span className="text-muted text-xs font-medium">Hidden</span>}
              </span>
              <span className="text-muted text-sm">
                {priceLabel(p.pricing_type, p.price_cents)} · {p.min_guests}
                {p.max_guests ? `–${p.max_guests}` : "+"} guests · {hoursLabel(p.included_minutes)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <ButtonLink href="/dashboard/catering/packages/new">Add a package</ButtonLink>

      <h2 className="mt-4 font-semibold">Add-ons</h2>
      {addOns.data.length === 0 ? (
        <p className="text-muted text-sm">Extras hosts can tick, like drinks or dessert.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {addOns.data.map((a) => (
            <li key={a.id}>
              <Link href={`/dashboard/catering/addons/${a.id}`} className={row}>
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">{a.name}</span>
                  {!a.is_active && <span className="text-muted text-xs font-medium">Hidden</span>}
                </span>
                <span className="text-muted text-sm">
                  {priceLabel(a.pricing_type, a.price_cents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ButtonLink href="/dashboard/catering/addons/new" variant="secondary">
        Add an add-on
      </ButtonLink>
    </div>
  );
}
