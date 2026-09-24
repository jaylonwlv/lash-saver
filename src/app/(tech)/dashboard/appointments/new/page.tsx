import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { ButtonLink } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { canTakeDeposits } from "@/lib/payments";
import { trialEligible } from "@/lib/stripe/billing";
import { canSendPayLinks } from "@/lib/subscription";
import { createClient, getUser } from "@/lib/supabase/server";
import { SubscribeCard } from "../../billing/subscribe-card";
import { wallClockParts } from "@/lib/time";
import { AppointmentForm } from "./appointment-form";

export const metadata: Metadata = { title: "New appointment" };

export default async function NewAppointmentPage({
  searchParams,
}: PageProps<"/dashboard/appointments/new">) {
  const { billing } = await searchParams;
  const user = await getUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: services, error }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "timezone, subscription_status, deposit_method, stripe_charges_enabled, cashapp_tag, zelle_contact, venmo_handle",
      )
      .eq("id", user!.id)
      .single(),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents, deposit_cents")
      .eq("tech_id", user!.id)
      .eq("is_active", true)
      .order("price_cents"),
  ]);
  if (error || !profile) throw new Error(`Loading services failed: ${error?.message}`);

  const depositsReady = canTakeDeposits(profile);
  const ready = depositsReady && services.length > 0;
  const subscribed = canSendPayLinks(profile.subscription_status);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/appointments" label="Appointments" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">New appointment</h1>
        <p className="text-muted text-sm">
          Agree on a time in your DMs, fill this in, then send the client the pay link.
        </p>
      </div>
      {billing === "started" && subscribed && (
        <p className="border-success text-success bg-surface rounded-2xl border p-4 text-sm">
          {profile.subscription_status === "trialing"
            ? "Your free trial has started. Create your first pay link below."
            : "You're subscribed. Create your pay link below."}
        </p>
      )}
      {billing === "no-trial" && (
        <p className="border-line bg-surface rounded-2xl border p-4 text-sm">
          That card was already used for a free trial, so your subscription started today.
        </p>
      )}
      {ready && !subscribed ? (
        <SubscribeCard trialEligible={await trialEligible(user!.id)} timezone={profile.timezone} />
      ) : ready ? (
        <AppointmentForm
          today={wallClockParts(new Date(), profile.timezone).date}
          timeZoneLabel={profile.timezone.replace(/_/g, " ")}
          cardFees={profile.deposit_method === "stripe"}
          services={services.map((s) => ({
            id: s.id,
            label: `${s.name} · ${formatDuration(s.duration_minutes)} · ${formatCents(s.price_cents)}`,
            priceCents: s.price_cents,
            depositCents: s.deposit_cents,
          }))}
        />
      ) : (
        <div className="border-line bg-surface flex flex-col gap-3 rounded-2xl border p-5">
          <p className="text-muted">
            {depositsReady
              ? "Add a service first, so the pay link knows the price and deposit."
              : "Set up deposits first (Cash App, Zelle, Venmo or Stripe), so clients can pay."}
          </p>
          <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
        </div>
      )}
    </div>
  );
}
