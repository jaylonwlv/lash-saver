import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { centsToDollarsInput } from "@/lib/money";
import { createClient, getUser } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Pricing & rules" };

const pct = (bps: number) => String(bps / 100);

export default async function CateringSettingsPage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: s, error } = await supabase
    .from("catering_settings")
    .select("*")
    .eq("tech_id", user!.id)
    .maybeSingle();
  if (error) throw new Error(`Loading catering settings failed: ${error.message}`);
  if (!s) redirect("/dashboard/catering");

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/catering" label="Catering" />
      <h1 className="font-display text-2xl font-bold">Pricing & rules</h1>
      <SettingsForm
        initial={{
          cuisine: s.cuisine ?? "",
          city: s.city ?? "",
          description: s.description ?? "",
          policy_text: s.policy_text ?? "",
          contract_terms: s.contract_terms ?? "",
          host_can_cancel: s.host_can_cancel ? "yes" : "no",
          full_refund_days: String(s.full_refund_days),
          minimum_spend:
            s.minimum_spend_cents === null ? "" : centsToDollarsInput(s.minimum_spend_cents),
          extra_hour_price:
            s.extra_hour_price_cents === null ? "" : centsToDollarsInput(s.extra_hour_price_cents),
          max_extra_hours: String(s.max_extra_hours),
          travel_fee: centsToDollarsInput(s.travel_fee_cents),
          service_fee: pct(s.service_fee_bps),
          tax: pct(s.tax_bps),
          deposit_type: s.deposit_type,
          deposit_percent: s.deposit_type === "percent" ? pct(s.deposit_value) : "30",
          deposit_flat: s.deposit_type === "flat" ? centsToDollarsInput(s.deposit_value) : "",
          balance_due_days_before: String(s.balance_due_days_before),
          daily_capacity: String(s.daily_capacity),
          min_notice_days: String(s.min_notice_days),
          max_advance_days: String(s.max_advance_days),
        }}
      />
    </div>
  );
}
