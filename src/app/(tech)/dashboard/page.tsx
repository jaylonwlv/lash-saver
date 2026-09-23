import type { Metadata } from "next";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, slug, stripe_charges_enabled")
    .eq("id", user!.id)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        Hi{profile?.business_name ? `, ${profile.business_name}` : ""}
      </h1>
      {/* TODO: onboarding checklist (profile → Stripe → first service), upcoming appointments. */}
      <section className="border-line bg-surface rounded-2xl border p-5">
        <p className="font-medium">Payouts</p>
        <p className="text-muted text-sm">
          {profile?.stripe_charges_enabled
            ? "Stripe is connected. You can take deposits."
            : "Connect Stripe to start taking deposits."}
        </p>
      </section>
    </div>
  );
}
