import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { SUBSCRIPTION_PRICE_CENTS } from "@/lib/config";
import { formatCents } from "@/lib/money";
import { trialEligible } from "@/lib/stripe/billing";
import { canSendPayLinks } from "@/lib/subscription";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { openBillingPortal } from "./actions";
import { BillingButton } from "./billing-buttons";
import { SubscribeCard } from "./subscribe-card";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: p, error } = await supabase
    .from("profiles")
    .select(
      "timezone, stripe_customer_id, subscription_status, trial_ends_at, current_period_end, cancel_at_period_end",
    )
    .eq("id", user!.id)
    .single();
  if (error || !p) throw new Error(`Loading billing failed: ${error?.message}`);

  const tz = p.timezone;
  const price = formatCents(SUBSCRIPTION_PRICE_CENTS);
  const status = p.subscription_status;
  const subscribed = canSendPayLinks(status);

  let summary: string;
  if (status === "trialing") {
    summary = p.cancel_at_period_end
      ? `Your free trial ends ${formatDate(p.trial_ends_at!, tz)}. You won't be charged, and you can't send new pay links after that.`
      : `Free trial until ${formatDate(p.trial_ends_at!, tz)}. Then ${price}/month on your card.`;
  } else if (status === "active") {
    summary = p.cancel_at_period_end
      ? `Cancelled. You can send pay links until ${formatDate(p.current_period_end!, tz)}.`
      : `Active: ${price}/month. Next charge ${formatDate(p.current_period_end!, tz)}.`;
  } else if (status === "past_due") {
    summary = `Your last payment didn't go through. Update your card to keep sending pay links.`;
  } else {
    summary = "No active subscription. Your existing pay links and reminders still work.";
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/profile" label="Profile" />
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className={status === "past_due" ? "text-danger" : "text-muted"}>{summary}</p>

      {subscribed || (status && p.stripe_customer_id) ? (
        <BillingButton
          action={openBillingPortal}
          label={status === "past_due" ? "Update card" : "Manage billing"}
          variant={status === "past_due" ? "primary" : "secondary"}
        />
      ) : null}
      {!subscribed && <SubscribeCard trialEligible={await trialEligible(user!.id)} timezone={tz} />}
      <p className="text-muted text-sm">
        In the billing portal you can change your card, download invoices, or cancel. Cancelling
        stops new pay links at the end of your paid period or trial.
      </p>
    </div>
  );
}
