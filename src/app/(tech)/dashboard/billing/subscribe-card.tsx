import { SUBSCRIPTION_PRICE_CENTS, TRIAL_DAYS } from "@/lib/config";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { startSubscription } from "./actions";
import { BillingButton } from "./billing-buttons";

function trialEndFromNow(): Date {
  return new Date(Date.now() + TRIAL_DAYS * 86_400_000);
}

/** Offer to start the trial (or subscribe) before the tech can send pay links. */
export function SubscribeCard({
  trialEligible,
  timezone,
}: {
  trialEligible: boolean;
  timezone: string;
}) {
  const price = formatCents(SUBSCRIPTION_PRICE_CENTS);
  const firstCharge = formatDate(trialEndFromNow(), timezone);

  return (
    <section className="border-brand bg-surface flex flex-col gap-3 rounded-2xl border-2 p-5">
      {trialEligible ? (
        <>
          <h2 className="font-semibold">Start your {TRIAL_DAYS}-day free trial</h2>
          <p className="text-muted text-sm">
            Add a card to start sending pay links. You won&apos;t be charged until {firstCharge}.
            Then it&apos;s {price}/month. Cancel anytime before then and you pay nothing.
          </p>
          <BillingButton action={startSubscription} label="Start free trial" />
        </>
      ) : (
        <>
          <h2 className="font-semibold">Subscribe to send pay links</h2>
          <p className="text-muted text-sm">
            {price}/month, cancel anytime. Your existing pay links and reminders keep working either
            way.
          </p>
          <BillingButton action={startSubscription} label={`Subscribe for ${price}/month`} />
        </>
      )}
      <p className="text-muted text-center text-xs">Secure checkout by Stripe.</p>
    </section>
  );
}
