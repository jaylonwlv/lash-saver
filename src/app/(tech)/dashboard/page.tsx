import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { CopyLink } from "@/components/ui/copy-link";
import { APP_NAME, depositAnnouncement, SUBSCRIPTION_PRICE_CENTS } from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { menuPageUrl, pageSlugFor } from "@/lib/slugs";
import { formatCents } from "@/lib/money";
import { freeUntil } from "@/lib/stripe/billing";
import { syncAccountStatus } from "@/lib/stripe/connect";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { manualHandles } from "@/lib/payments";
import { setupState } from "@/lib/setup";
import { canSendPayLinks } from "@/lib/subscription";
import { loadSavings, savingsSummary } from "@/lib/savings";
import { OTHER_TRADE, TRADES } from "@/lib/trades";
import { TradePicker } from "./onboarding/trade-picker";
import { InstallBanner } from "../install-banner";
import { AlertsEmail } from "./confirm-email/confirm-email";
import { AnnouncementCard } from "./announcement-card";
import { SavedReplyCard } from "./saved-reply-card";
import { startStripeOnboarding } from "./stripe/actions";
import { StripeButton } from "./stripe/stripe-button";
import {
  Badge,
  Hero,
  NeedsYou,
  NewAppointmentCard,
  NextUp,
  ProgressRing,
  Results,
  Stat,
  StatRow,
  Step,
  type StepStatus,
  Tile,
} from "./home";
import { loadPulse } from "./pulse";
import { Tour, TourLauncher, type TourStep } from "./tour";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { stripe: stripeParam, tour } = await searchParams;
  const user = await getUser();
  const supabase = await createClient();

  const [
    { data: profile, error },
    { count: activeServices },
    { count: starterServices },
    { count: payLinks },
    { count: cateringSetUp },
    { data: topService },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "business_name, slug, timezone, stripe_account_id, stripe_details_submitted, stripe_charges_enabled, subscription_status, trial_ends_at, cancel_at_period_end, deposit_method, cashapp_tag, zelle_contact, venmo_handle, trade, email, email_confirmed, cancellation_window_hours, tour_seen_at, accent_color, page_style",
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
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("tech_id", user!.id),
    // Catering can be turned on by any pro, not only food trucks.
    supabase
      .from("catering_settings")
      .select("tech_id", { count: "exact", head: true })
      .eq("tech_id", user!.id),
    // The tour's value card puts a no-show in the pro's own numbers.
    supabase
      .from("services")
      .select("name, price_cents, deposit_cents")
      .eq("tech_id", user!.id)
      .eq("is_active", true)
      .order("price_cents", { ascending: false })
      .limit(1)
      .maybeSingle(),
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
  const setup = setupState(profile, activeServices ?? 0);
  const profileDone = setup.profileDone;
  const stripeStatus: StepStatus = setup.depositsDone
    ? "done"
    : !manual && profile.stripe_details_submitted
      ? "waiting"
      : "todo";
  const handles = manualHandles(profile);
  const servicesDone = setup.servicesDone;
  const allDone = setup.ready;
  const subscribed = canSendPayLinks(profile.subscription_status);
  const firstLinkSent = (payLinks ?? 0) > 0;
  const stepsDone = [profileDone, stripeStatus === "done", servicesDone, firstLinkSent].filter(
    Boolean,
  ).length;
  const menuUrl = profile.slug ? menuPageUrl(publicEnv().NEXT_PUBLIC_APP_URL, profile.slug) : null;
  // Their first pay link is out without a card; the next one asks for it. Say so on the
  // button that leads there, so the trial card is never a surprise.
  const nextNeedsCard = firstLinkSent && !subscribed;
  const until = nextNeedsCard ? await freeUntil(user!.id).catch(() => undefined) : null;
  const eligible = until === undefined ? null : until !== null;
  const monthly = `${formatCents(SUBSCRIPTION_PRICE_CENTS).replace(/\.00$/, "")}/month`;
  const trialDaysLeft =
    profile.subscription_status === "trialing" && profile.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(profile.trial_ends_at).getTime() - new Date().getTime()) / 86_400_000,
          ),
        )
      : null;
  // Everything done and no example prices left: the checklist shrinks to one line.
  const setupComplete = allDone && firstLinkSent && !starterServices;
  // A failed snapshot only hides its cards; the rest of the dashboard still loads.
  const pulse = firstLinkSent
    ? await loadPulse(supabase, user!.id, profile.timezone).catch((err) => {
        console.error("Loading dashboard snapshot failed", err);
        return null;
      })
    : null;
  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: profile.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const statuses: StepStatus[] = [
    profileDone ? "done" : "todo",
    stripeStatus,
    servicesDone ? "done" : "todo",
    firstLinkSent ? "done" : "todo",
  ];
  // The step to do next gets a pink ring.
  const current = statuses.findIndex((s) => s !== "done");
  const newHint = nextNeedsCard
    ? eligible === true
      ? `Your next pay link needs your card: $0 today, free until ${until}.`
      : eligible === false
        ? `Your next pay link needs a subscription (${monthly}, cancel anytime).`
        : "Your next pay link needs your card."
    : "Make the pay link. The deposit locks in their spot.";

  // The tour's last card: what's left before the first booking, each a tap away.
  const tourSteps: TourStep[] = [
    {
      title: "Check your profile & policy",
      detail: "Business name, menu page link, cancellation window",
      href: "/dashboard/profile",
      done: profileDone,
    },
    {
      title: "Choose how clients pay",
      detail: "Your Cash App, Zelle or Venmo, or cards",
      href: "/dashboard/payments",
      done: stripeStatus === "done",
    },
    {
      title: starterServices ? "Set your prices" : "Add your services",
      detail: starterServices
        ? "Swap the example prices for what you charge"
        : "What you offer, the price and the deposit",
      href: "/dashboard/services",
      done: servicesDone && !starterServices,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Tour
        accountId={user!.id}
        steps={tourSteps}
        // After the "What do you do?" picker, never on top of it.
        eligible={!firstLinkSent && profile.trade !== null && !profile.tour_seen_at}
        force={tour === "1"}
        look={{
          style: profile.page_style,
          accent: profile.accent_color,
          // No link yet (signed up without /start): the address their page will get.
          address: menuUrl
            ? menuUrl.replace(/^https?:\/\//, "")
            : `${new URL(publicEnv().NEXT_PUBLIC_APP_URL).host}/${pageSlugFor(profile.business_name ?? "your business")}`,
          examplePrices: (starterServices ?? 0) > 0,
          trade: profile.trade,
        }}
        example={
          topService && topService.price_cents > topService.deposit_cents
            ? {
                service: topService.name,
                price: dollars(topService.price_cents),
                deposit: dollars(topService.deposit_cents),
              }
            : null
        }
      />
      <Hero
        today={today}
        greeting={`Hey${profile.business_name ? `, ${profile.business_name}` : ""}`}
        badge={
          trialDaysLeft !== null ? (
            <Badge href="/dashboard/billing">
              {profile.cancel_at_period_end
                ? `Trial ends ${formatDate(profile.trial_ends_at!, profile.timezone)} · cancelled`
                : trialDaysLeft === 0
                  ? "Free trial · ends today"
                  : `Free trial · ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`}
            </Badge>
          ) : null
        }
      >
        {pulse ? (
          <StatRow>
            <Stat href="/dashboard/appointments" value={pulse.upcoming} label="booked & paid" />
            <Stat
              href="/dashboard/appointments"
              value={pulse.waiting}
              label="waiting on a deposit"
            />
          </StatRow>
        ) : (
          !firstLinkSent && (
            <div className="flex items-center gap-4 rounded-[22px] bg-white/55 p-3.5 dark:bg-white/10">
              <ProgressRing done={stepsDone} total={4} />
              <p className="font-display text-lg leading-tight font-extrabold">
                {stepsDone === 3
                  ? "One step to your first pay link"
                  : `${4 - stepsDone} steps to your first pay link`}
                <span className="text-ink/70 block text-sm font-semibold dark:text-white/60">
                  No card needed for it.
                </span>
              </p>
            </div>
          )
        )}
      </Hero>

      {/* Instant sign-ups: where alerts go, so a typo is caught here, not in their inbox. */}
      {!profile.email_confirmed && <AlertsEmail email={profile.email} />}
      <InstallBanner placement="page" payLinkSent={firstLinkSent} />

      {profile.subscription_status === "past_due" && (
        <Link
          href="/dashboard/billing"
          className="press border-danger text-danger bg-surface rounded-[22px] border-2 p-4 text-sm font-semibold"
        >
          Your {APP_NAME} payment didn&apos;t go through. Tap to update your card and keep sending
          pay links.
        </Link>
      )}

      {stripeParam === "error" && (
        <p className="text-danger text-sm">
          We couldn&apos;t reopen Stripe setup. Tap the Stripe button below to try again.
        </p>
      )}

      {profile.trade === null && (
        <TradePicker
          options={TRADES.map(({ id, label, emoji, services }) => ({
            id,
            label,
            emoji,
            preview: services.map((service) => service.name).join(" · "),
          }))}
          other={OTHER_TRADE}
          hasServices={(activeServices ?? 0) > 0}
        />
      )}

      {allDone && menuUrl && <NewAppointmentCard hint={newHint} i={0} />}
      {pulse && pulse.tasks.length > 0 && (
        <NeedsYou tasks={pulse.tasks} more={pulse.moreTasks} i={1} />
      )}
      {pulse?.next && <NextUp {...pulse.next} i={2} />}
      {savings && <Results headline={savings.headline} lines={savings.lines} i={3} />}

      {(profile.trade === "catering" || (cateringSetUp ?? 0) > 0) && (
        <Link
          href="/dashboard/catering"
          className="rise press bg-ink flex min-h-12 items-center justify-between gap-3 rounded-[28px] p-5 text-white dark:ring-1 dark:ring-white/10"
        >
          <span className="flex flex-col gap-1">
            <span className="font-display text-pink text-lg font-bold">🚚 Catering quote page</span>
            <span className="text-sm text-white/80">
              Hosts get your price for their date and guest count, then pay a deposit.
            </span>
          </span>
          <span aria-hidden className="text-pink text-xl">
            →
          </span>
        </Link>
      )}

      {allDone && menuUrl ? (
        <>
          {!firstLinkSent && (
            <AnnouncementCard message={depositAnnouncement(profile.cancellation_window_hours)} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Tile
              href="/dashboard/appointments"
              emoji="📅"
              label="Appointments"
              note={pulse ? `${pulse.upcoming} coming up` : undefined}
              i={4}
            />
            <Tile
              href="/dashboard/clients"
              emoji="👥"
              label="Your clients"
              note="History & flags"
              i={5}
            />
          </div>
          <SavedReplyCard />
          <section className="card flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="bg-brand-soft flex size-11 shrink-0 items-center justify-center rounded-[14px] text-xl"
              >
                🔗
              </span>
              <div className="flex flex-col">
                <h2 className="font-display text-xl leading-tight font-extrabold tracking-tight">
                  Put your page in your bio
                </h2>
                <p className="text-muted text-sm">Your services, prices and policy, one link</p>
              </div>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              <BioPerk>
                <strong>New clients find you easier.</strong> Anyone who taps your bio sees what you
                offer and what it costs, so they message you ready to book.
              </BioPerk>
              <BioPerk>
                <strong>Fewer &ldquo;how much?&rdquo; DMs.</strong> Prices and deposits are right
                there, so you skip the back-and-forth.
              </BioPerk>
              <BioPerk>
                <strong>Your rules, up front.</strong> Clients see your deposit and cancellation
                policy before they ever message, so the deposit is never a surprise.
              </BioPerk>
              <BioPerk>
                <strong>Easy to pass along.</strong> Regulars can send one link to a friend, and it
                shows your name and prices in the preview.
              </BioPerk>
            </ul>
            <CopyLink
              url={menuUrl}
              display={menuUrl.replace(/^https?:\/\//, "")}
              label="Copy menu page link"
              tinted
            />
            {(starterServices ?? 0) > 0 && (
              <p className="bg-brand-soft/60 rounded-2xl px-4 py-3 text-sm">
                Your page only shows prices you&apos;ve saved, so example prices stay hidden.{" "}
                <Link href="/dashboard/services" className="text-brand font-semibold underline">
                  Set your prices
                </Link>{" "}
                before you add it to your bio.
              </p>
            )}
            <p className="text-muted text-sm">
              <strong className="text-foreground">To add it:</strong> on Instagram, tap Edit profile
              → Links → Add external link, and paste it.
            </p>
            <p className="text-muted text-sm">
              <strong className="text-foreground">This isn&apos;t a pay link.</strong> It
              doesn&apos;t book anyone or take a deposit. To lock in a client, tap{" "}
              <strong className="text-foreground">New appointment</strong> and send them the pay
              link it makes.
            </p>
            <Link
              href={menuUrl}
              target="_blank"
              className="text-brand inline-flex min-h-12 items-center justify-center text-sm font-semibold underline"
            >
              See what people see
            </Link>
          </section>
        </>
      ) : (
        <p className="text-muted px-1 text-sm">Finish these steps to start taking deposits.</p>
      )}

      {setupComplete ? (
        <section className="card flex flex-col gap-3 p-5">
          <p className="flex items-center gap-3 font-extrabold">
            <span
              aria-hidden
              className="bg-pink text-ink flex size-8 items-center justify-center rounded-[10px] text-sm"
            >
              ✓
            </span>
            All set up
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/dashboard/profile", label: "Profile" },
              { href: "/dashboard/payments", label: "Deposits" },
              { href: "/dashboard/services", label: "Services" },
              { href: "/dashboard/billing", label: "Billing" },
            ].map((chip) => (
              <Link
                key={chip.href}
                href={chip.href}
                className="press bg-background active:bg-brand-soft inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-bold"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <ol className="flex flex-col gap-3">
          <Step
            number={1}
            title="Set up your profile"
            status={statuses[0]}
            current={current === 0}
            description="Your business name, menu page link and cancellation policy."
            edit={{
              href: "/dashboard/profile",
              label: `Your page: ${menuUrl?.replace(/^https?:\/\//, "")}`,
            }}
            i={6}
          >
            <ButtonLink href="/dashboard/profile" variant={profileDone ? "secondary" : "primary"}>
              {profileDone ? "Edit profile" : "Set up profile"}
            </ButtonLink>
          </Step>

          <Step
            number={2}
            title="Set up deposits"
            status={stripeStatus}
            current={current === 1}
            description={
              stripeStatus === "waiting"
                ? "Stripe is checking your details. This usually takes a few minutes; if Stripe needs anything else, tap below."
                : setup.needsHandle
                  ? "Add your Cash App, Zelle or Venmo so clients know where to send the deposit (1 minute). Or take cards with Stripe."
                  : "Choose how clients pay you. Keep your Cash App, Zelle or Venmo (2 minutes), or take cards automatically with Stripe."
            }
            edit={{
              href: "/dashboard/payments",
              label: manual
                ? `Clients pay with ${handles.map((h) => h.label).join(", ")}`
                : "Clients pay by card, deposits go to your bank",
            }}
            i={7}
          >
            {stripeStatus === "done" ? null : stripeStatus === "waiting" ? (
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
            title={starterServices ? "Set your prices" : "Add your services"}
            status={servicesDone && !starterServices ? "done" : servicesDone ? "todo" : statuses[2]}
            current={current === 2 || (current === -1 && !!starterServices)}
            description={
              starterServices
                ? `${starterServices} still ${starterServices === 1 ? "has an example price" : "have example prices"}. Edit them to match what you charge.`
                : "What you offer, how long it takes, the price and the deposit."
            }
            edit={{
              href: "/dashboard/services",
              label: `${activeServices} service${activeServices === 1 ? "" : "s"} on your menu page`,
            }}
            i={8}
          >
            <ButtonLink
              href={servicesDone ? "/dashboard/services" : "/dashboard/services/new"}
              variant={servicesDone && !starterServices ? "secondary" : "primary"}
            >
              {starterServices
                ? "Set your prices"
                : servicesDone
                  ? `${activeServices} service${activeServices === 1 ? "" : "s"} · manage`
                  : "Add a service"}
            </ButtonLink>
          </Step>

          <Step
            number={4}
            title="Send your first pay link"
            status={statuses[3]}
            current={current === 3}
            description={
              !allDone
                ? "Unlocks after the steps above. No card needed for your first one."
                : subscribed
                  ? "Next time a client picks a time in your DMs, tap New appointment and paste them the pay link."
                  : "No card needed for your first one. Next time a client picks a time in your DMs, tap New appointment and paste them the pay link."
            }
            i={9}
          >
            {allDone && !firstLinkSent && (
              <ButtonLink href="/dashboard/appointments/new">New appointment</ButtonLink>
            )}
          </Step>
        </ol>
      )}
      {!(allDone && menuUrl) && !firstLinkSent && (
        <AnnouncementCard message={depositAnnouncement(profile.cancellation_window_hours)} />
      )}

      {profileDone && !allDone && menuUrl && (
        <p className="text-muted px-1 text-sm">
          Your menu page goes live at{" "}
          <Link href={menuUrl} className="text-brand underline">
            {menuUrl.replace(/^https?:\/\//, "")}
          </Link>{" "}
          once{" "}
          {stripeStatus === "done"
            ? "you add a service."
            : servicesDone
              ? "deposits are set up."
              : "deposits are set up and you add a service."}
        </p>
      )}
      <TourLauncher />
    </div>
  );
}

/** "$150" for whole dollars, "$12.50" otherwise. */
function dollars(cents: number): string {
  return formatCents(cents).replace(/\.00$/, "");
}

/** One reason to put the menu page in their bio. */
function BioPerk({ children }: { children: ReactNode }) {
  return (
    <li className="text-muted flex gap-2">
      <span aria-hidden className="text-brand font-bold">
        ✓
      </span>
      <span className="[&_strong]:text-foreground">{children}</span>
    </li>
  );
}
