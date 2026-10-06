import Link from "next/link";
import { REMINDER_OFFSETS_HOURS, SUBSCRIPTION_PRICE_CENTS, TRIAL_DAYS } from "@/lib/config";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { startSubscription } from "./actions";
import { BillingButton } from "./billing-buttons";

function trialEndFromNow(): Date {
  return new Date(Date.now() + TRIAL_DAYS * 86_400_000);
}

/** "$29" rather than "$29.00" in headlines. */
const wholeDollars = (cents: number) => formatCents(cents).replace(/\.00$/, "");

/**
 * The moment a pro commits: shown in place of the pay link form (and on Billing)
 * until they start the trial or subscribe. It sells what a deposit does for them,
 * in their own numbers when we have them, with one big button.
 */
export function SubscribeCard({
  trialEligible,
  timezone,
  topService,
}: {
  trialEligible: boolean;
  timezone: string;
  /** Their priciest service, for "one no-show costs you more than a month of Dibs". */
  topService?: { name: string; priceCents: number } | null;
}) {
  const price = wholeDollars(SUBSCRIPTION_PRICE_CENTS);
  const firstCharge = formatDate(trialEndFromNow(), timezone);
  const reminders = [...REMINDER_OFFSETS_HOURS]
    .sort((a, b) => b - a)
    .map((h) => `${h}h`)
    .join(" and ");
  // Only when it's true: one missed appointment costs at least a month of Dibs.
  const lossLine =
    topService && topService.priceCents >= SUBSCRIPTION_PRICE_CENTS ? topService : null;

  return (
    <section className="bg-ink relative flex flex-col gap-5 overflow-hidden rounded-[28px] p-6 text-white shadow-[0_20px_50px_-20px_var(--pink)]">
      {/* A pink glow in the corner, so the card reads as the moment, not a form. */}
      <div
        aria-hidden
        className="bg-pink pointer-events-none absolute -top-24 -right-24 size-56 rounded-full opacity-35 blur-3xl"
      />
      <div className="relative flex flex-col gap-2">
        <p className="text-pink text-xs font-bold tracking-[0.08em] uppercase">
          {trialEligible ? "Last step before your first pay link" : "Subscribe to send pay links"}
        </p>
        <h2 className="font-display text-[34px] leading-[1.02] font-extrabold tracking-tight">
          {/* Non-breaking hyphen: "no-" never ends a line. */}
          Your next no{"\u2011"}show <span className="text-pink">pays you.</span>
        </h2>
        <p className="text-white/75">
          {trialEligible
            ? `Start your ${TRIAL_DAYS}-day free trial and send your first pay link in under a minute.`
            : "Pick up where you left off and send your next pay link in under a minute."}
        </p>
      </div>

      {lossLine && (
        <p className="bg-pink/15 relative rounded-2xl p-4 text-sm">
          One missed <strong>{lossLine.name}</strong> costs you{" "}
          <strong className="text-pink">{wholeDollars(lossLine.priceCents)}</strong>. Protecting
          every booking is <strong>{price}/month</strong>.
        </p>
      )}

      <ul className="relative flex flex-col gap-3 text-[15px]">
        {[
          "Clients pay a deposit before the spot is theirs",
          `They agree to your cancellation policy and get reminders ${reminders} before`,
          "No-show? Keep the deposit with one tap",
          "Can't make it? They cancel from the link instead of ghosting you",
        ].map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span
              aria-hidden
              className="bg-pink text-ink mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            >
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>

      <div className="relative flex flex-col gap-3 [&_.text-danger]:text-white">
        <BillingButton
          action={startSubscription}
          label={trialEligible ? "Start my free trial" : `Subscribe for ${price}/month`}
          className="min-h-14 text-lg font-bold"
        />
        <p className="text-center text-sm text-white/75">
          {trialEligible
            ? `$0 today · ${price}/month from ${firstCharge} · Cancel before then and pay nothing`
            : "Cancel anytime. Existing pay links and reminders keep working either way."}
        </p>
      </div>

      <p className="relative text-center text-xs text-white/55">
        🔒 Secure checkout by Stripe. Renews monthly until you cancel. By continuing you agree to
        the{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>
        .
      </p>
    </section>
  );
}
