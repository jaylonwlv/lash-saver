import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { CopyLink } from "@/components/ui/copy-link";
import { APP_NAME } from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { syncAccountStatus } from "@/lib/stripe/connect";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { canTakeDeposits, manualHandles } from "@/lib/payments";
import { loadSavings, savingsSummary } from "@/lib/savings";
import { OTHER_TRADE, TRADES } from "@/lib/trades";
import { TradePicker } from "./onboarding/trade-picker";
import { startStripeOnboarding } from "./stripe/actions";
import { StripeButton } from "./stripe/stripe-button";

export const metadata: Metadata = { title: "Dashboard" };

type StepStatus = "done" | "todo" | "waiting";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { stripe: stripeParam } = await searchParams;
  const user = await getUser();
  const supabase = await createClient();

  const [{ data: profile, error }, { count: activeServices }, { count: starterServices }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "business_name, slug, timezone, stripe_account_id, stripe_details_submitted, stripe_charges_enabled, subscription_status, trial_ends_at, cancel_at_period_end, deposit_method, cashapp_tag, zelle_contact, venmo_handle, trade",
        )
        .eq("id", user!.id)
        .single(),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("tech_id", user!.id)
        .eq("is_active", true),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("tech_id", user!.id)
        .eq("is_active", true)
        .eq("is_starter", true),
    ]);
  if (error || !profile) throw new Error(`Loading profile failed: ${error?.message}`);

  // While onboarding is unfinished, refresh status from Stripe on each visit so the
  // checklist doesn't depend on webhook timing. Once ready, the webhook keeps it current.
  const manual = profile.deposit_method === "manual";
  if (!manual && profile.stripe_account_id && !profile.stripe_charges_enabled) {
    try {
      const status = await syncAccountStatus(profile.stripe_account_id);
      profile.stripe_charges_enabled = status.ready;
      profile.stripe_details_submitted = status.detailsSubmitted;
    } catch (err) {
      console.error("Stripe status refresh failed", err);
    }
  }

  // A failed lookup only hides the results card; the rest of the dashboard still loads.
  const savings = await loadSavings(supabase, user!.id).then(savingsSummary, (err) => {
    console.error("Loading savings failed", err);
    return null;
  });
  const profileDone = Boolean(profile.business_name && profile.slug);
  const stripeStatus: StepStatus = canTakeDeposits(profile)
    ? "done"
    : !manual && profile.stripe_details_submitted
      ? "waiting"
      : "todo";
  const handles = manualHandles(profile);
  const servicesDone = (activeServices ?? 0) > 0;
  const allDone = profileDone && stripeStatus === "done" && servicesDone;
  const menuUrl = profile.slug ? `${publicEnv().NEXT_PUBLIC_APP_URL}/b/${profile.slug}` : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        Hi{profile.business_name ? `, ${profile.business_name}` : ""}
      </h1>

      {profile.subscription_status === "past_due" && (
        <Link
          href="/dashboard/billing"
          className="border-danger text-danger bg-surface rounded-2xl border p-4 text-sm"
        >
          Your {APP_NAME} payment didn&apos;t go through. Tap to update your card and keep sending
          pay links.
        </Link>
      )}
      {profile.subscription_status === "trialing" && profile.trial_ends_at && (
        <Link
          href="/dashboard/billing"
          className="border-line bg-surface text-muted rounded-2xl border p-4 text-sm"
        >
          Free trial until {formatDate(profile.trial_ends_at, profile.timezone)}
          {profile.cancel_at_period_end ? " (cancelled)" : ""}. Manage billing →
        </Link>
      )}

      {savings && (
        <section className="bg-ink flex flex-col gap-2 rounded-2xl p-5 text-white">
          <p className="text-pink text-xs font-semibold tracking-wide uppercase">Your results</p>
          <h2 className="text-2xl font-bold">{savings.headline}</h2>
          {savings.lines.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-white/80">
              {savings.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {stripeParam === "error" && (
        <p className="text-danger text-sm">
          We couldn&apos;t reopen Stripe setup. Tap the Stripe button below to try again.
        </p>
      )}

      {profile.trade === null && (
        <TradePicker
          options={TRADES.map(({ id, label, emoji }) => ({ id, label, emoji }))}
          other={OTHER_TRADE}
          hasServices={(activeServices ?? 0) > 0}
        />
      )}

      {allDone && menuUrl ? (
        <>
          <section className="border-line bg-surface flex flex-col gap-3 rounded-2xl border p-5">
            <h2 className="font-semibold">Book a client</h2>
            <p className="text-muted text-sm">
              Agree on a time in your DMs, then create a pay link. The client pays the deposit to
              lock in their spot.
            </p>
            <ButtonLink href="/dashboard/appointments/new">New appointment</ButtonLink>
            <ButtonLink href="/dashboard/appointments" variant="secondary">
              See appointments
            </ButtonLink>
            <ButtonLink href="/dashboard/clients" variant="secondary">
              Your clients
            </ButtonLink>
          </section>
          <section className="border-line bg-surface flex flex-col gap-3 rounded-2xl border p-5">
            <h2 className="font-semibold">Your menu page, for your bio</h2>
            <p className="text-muted text-sm">
              Your services, prices and policy on one page. Put it in your Instagram bio so people
              can see what you offer, then message you to book.
            </p>
            <p className="bg-background rounded-xl p-3 text-sm">
              <strong>This isn&apos;t a pay link.</strong> It doesn&apos;t book anyone or take a
              deposit. To lock in a client, tap <strong>New appointment</strong> and send them the
              pay link it makes.
            </p>
            <CopyLink url={menuUrl} label="Copy menu page link" variant="secondary" />
            <Link
              href={menuUrl}
              target="_blank"
              className="text-brand inline-flex min-h-12 items-center justify-center text-sm font-medium underline"
            >
              See what people see
            </Link>
          </section>
        </>
      ) : (
        <p className="text-muted">Finish these steps to start taking deposits.</p>
      )}

      <ol className="flex flex-col gap-3">
        <Step
          number={1}
          title="Set up your profile"
          status={profileDone ? "done" : "todo"}
          description={
            profileDone
              ? `Your menu page is at /b/${profile.slug}.`
              : "Your business name, menu page link and cancellation policy."
          }
        >
          <ButtonLink href="/dashboard/profile" variant={profileDone ? "secondary" : "primary"}>
            {profileDone ? "Edit profile" : "Set up profile"}
          </ButtonLink>
        </Step>

        <Step
          number={2}
          title="Set up deposits"
          status={stripeStatus}
          description={
            stripeStatus === "done"
              ? manual
                ? `Clients pay you with ${handles.map((h) => h.label).join(", ")}. You confirm each deposit.`
                : "Clients pay by card or Apple Pay, and deposits go to your bank automatically."
              : stripeStatus === "waiting"
                ? "Stripe is checking your details. This usually takes a few minutes; if Stripe needs anything else, tap below."
                : "Choose how clients pay you. Keep your Cash App, Zelle or Venmo (2 minutes), or take cards automatically with Stripe."
          }
        >
          {stripeStatus === "done" ? (
            <ButtonLink href="/dashboard/payments" variant="secondary">
              Deposit settings
            </ButtonLink>
          ) : stripeStatus === "waiting" ? (
            <StripeButton action={startStripeOnboarding} label="Check Stripe details" />
          ) : (
            <>
              <ButtonLink href="/dashboard/payments">Use Cash App, Zelle or Venmo</ButtonLink>
              <ButtonLink href="/dashboard/payments" variant="secondary">
                Take cards with Stripe
              </ButtonLink>
            </>
          )}
        </Step>

        <Step
          number={3}
          title="Add your services"
          status={servicesDone ? "done" : "todo"}
          description={
            starterServices
              ? `${starterServices} still ${starterServices === 1 ? "has an example price" : "have example prices"}. Edit them to match what you charge.`
              : servicesDone
                ? `${activeServices} service${activeServices === 1 ? "" : "s"} on your menu page.`
                : "What you offer, how long it takes, the price and the deposit."
          }
        >
          <ButtonLink
            href={servicesDone ? "/dashboard/services" : "/dashboard/services/new"}
            variant={servicesDone && !starterServices ? "secondary" : "primary"}
          >
            {starterServices
              ? "Set your prices"
              : servicesDone
                ? "Manage services"
                : "Add a service"}
          </ButtonLink>
        </Step>
      </ol>

      {profileDone && !allDone && menuUrl && (
        <p className="text-muted text-sm">
          Your menu page goes live at{" "}
          <Link href={menuUrl} className="text-brand underline">
            /b/{profile.slug}
          </Link>{" "}
          once{" "}
          {stripeStatus === "done"
            ? "you add a service."
            : servicesDone
              ? "deposits are set up."
              : "deposits are set up and you add a service."}
        </p>
      )}
    </div>
  );
}

const statusLabel: Record<StepStatus, string> = {
  done: "Done",
  todo: "To do",
  waiting: "In review",
};

function Step({
  number,
  title,
  status,
  description,
  children,
}: {
  number: number;
  title: string;
  status: StepStatus;
  description: string;
  children: ReactNode;
}) {
  return (
    <li className="border-line bg-surface flex flex-col gap-3 rounded-2xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              status === "done"
                ? "bg-success text-brand-foreground"
                : "bg-background text-foreground"
            }`}
          >
            {status === "done" ? "✓" : number}
          </span>
          <h2 className="font-semibold">{title}</h2>
        </div>
        <span
          className={`shrink-0 text-xs font-medium ${
            status === "done" ? "text-success" : "text-muted"
          }`}
        >
          {statusLabel[status]}
        </span>
      </div>
      <p className="text-muted text-sm">{description}</p>
      {children}
    </li>
  );
}
