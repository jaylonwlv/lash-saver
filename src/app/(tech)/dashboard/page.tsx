import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { CopyLink } from "@/components/ui/copy-link";
import { publicEnv } from "@/lib/env.public";
import { syncAccountStatus } from "@/lib/stripe/connect";
import { createClient, getUser } from "@/lib/supabase/server";
import { openStripeDashboard, startStripeOnboarding } from "./stripe/actions";
import { StripeButton } from "./stripe/stripe-button";

export const metadata: Metadata = { title: "Dashboard" };

type StepStatus = "done" | "todo" | "waiting";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { stripe: stripeParam } = await searchParams;
  const user = await getUser();
  const supabase = await createClient();

  const [{ data: profile, error }, { count: activeServices }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "business_name, slug, stripe_account_id, stripe_details_submitted, stripe_charges_enabled",
      )
      .eq("id", user!.id)
      .single(),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("tech_id", user!.id)
      .eq("is_active", true),
  ]);
  if (error || !profile) throw new Error(`Loading profile failed: ${error?.message}`);

  // While onboarding is unfinished, refresh status from Stripe on each visit so the
  // checklist doesn't depend on webhook timing. Once ready, the webhook keeps it current.
  if (profile.stripe_account_id && !profile.stripe_charges_enabled) {
    try {
      const status = await syncAccountStatus(profile.stripe_account_id);
      profile.stripe_charges_enabled = status.ready;
      profile.stripe_details_submitted = status.detailsSubmitted;
    } catch (err) {
      console.error("Stripe status refresh failed", err);
    }
  }

  const profileDone = Boolean(profile.business_name && profile.slug);
  const stripeStatus: StepStatus = profile.stripe_charges_enabled
    ? "done"
    : profile.stripe_details_submitted
      ? "waiting"
      : "todo";
  const servicesDone = (activeServices ?? 0) > 0;
  const allDone = profileDone && stripeStatus === "done" && servicesDone;
  const bookingUrl = profile.slug ? `${publicEnv().NEXT_PUBLIC_APP_URL}/b/${profile.slug}` : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        Hi{profile.business_name ? `, ${profile.business_name}` : ""}
      </h1>

      {stripeParam === "error" && (
        <p className="text-danger text-sm">
          We couldn&apos;t reopen Stripe setup. Tap the Stripe button below to try again.
        </p>
      )}

      {allDone && bookingUrl ? (
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
          </section>
          <section className="border-line bg-surface flex flex-col gap-3 rounded-2xl border p-5">
            <h2 className="font-semibold">Your booking page</h2>
            <p className="text-muted text-sm">
              Your services and prices, for your Instagram bio. Clients message you to book.
            </p>
            <CopyLink url={bookingUrl} label="Copy booking page link" />
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
              ? `Your booking link ends in /b/${profile.slug}.`
              : "Your business name, booking link and cancellation policy."
          }
        >
          <ButtonLink href="/dashboard/profile" variant={profileDone ? "secondary" : "primary"}>
            {profileDone ? "Edit profile" : "Set up profile"}
          </ButtonLink>
        </Step>

        <Step
          number={2}
          title="Connect Stripe"
          status={stripeStatus}
          description={
            stripeStatus === "done"
              ? "Deposits are paid out to your bank account."
              : stripeStatus === "waiting"
                ? "Stripe is checking your details. This usually takes a few minutes; if Stripe needs anything else, tap below."
                : "Stripe handles payments and sends deposits to your bank account. Takes about 5 minutes."
          }
        >
          {stripeStatus === "done" ? (
            <StripeButton action={openStripeDashboard} label="View payouts" variant="secondary" />
          ) : (
            <StripeButton
              action={startStripeOnboarding}
              label={
                stripeStatus === "waiting"
                  ? "Check Stripe details"
                  : profile.stripe_account_id
                    ? "Continue Stripe setup"
                    : "Connect Stripe"
              }
            />
          )}
        </Step>

        <Step
          number={3}
          title="Add your services"
          status={servicesDone ? "done" : "todo"}
          description={
            servicesDone
              ? `${activeServices} service${activeServices === 1 ? "" : "s"} on your booking page.`
              : "What you offer, how long it takes, the price and the deposit."
          }
        >
          <ButtonLink
            href={servicesDone ? "/dashboard/services" : "/dashboard/services/new"}
            variant={servicesDone ? "secondary" : "primary"}
          >
            {servicesDone ? "Manage services" : "Add a service"}
          </ButtonLink>
        </Step>
      </ol>

      {profileDone && !allDone && bookingUrl && (
        <p className="text-muted text-sm">
          Your booking page goes live at{" "}
          <Link href={bookingUrl} className="text-brand underline">
            /b/{profile.slug}
          </Link>{" "}
          once{" "}
          {stripeStatus === "done"
            ? "you add a service."
            : servicesDone
              ? "Stripe is connected."
              : "Stripe is connected and you add a service."}
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
