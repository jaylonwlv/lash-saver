import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { centsToDollarsInput } from "@/lib/money";
import { createClient, getUser } from "@/lib/supabase/server";
import { ConfirmPricesForm } from "./confirm-form";

export const metadata: Metadata = { title: "Confirm your prices" };

/** One screen to swap every example price for their own, so their page shows a full menu. */
export default async function ConfirmPricesPage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: services, error } = await supabase
    .from("services")
    .select("id, name, price_cents, deposit_cents")
    .eq("tech_id", user!.id)
    .eq("is_active", true)
    .eq("is_starter", true)
    .order("price_cents");
  if (error) throw new Error(`Loading services failed: ${error.message}`);
  if (services.length === 0) redirect("/dashboard/services");

  return (
    <div className="flex flex-col gap-5">
      <BackLink href="/dashboard" label="Dashboard" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Confirm your prices</h1>
        <p className="text-muted">
          These are example prices. Change them to what you charge and save once. They show on your
          page right away.
        </p>
      </div>
      <ConfirmPricesForm
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          price: centsToDollarsInput(s.price_cents),
          deposit: centsToDollarsInput(s.deposit_cents),
        }))}
      />
    </div>
  );
}
