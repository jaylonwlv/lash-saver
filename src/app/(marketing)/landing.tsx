import { Bricolage_Grotesque } from "next/font/google";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import {
  APP_NAME,
  PROCESSING_FEE_LABEL,
  SUBSCRIPTION_PRICE_CENTS,
  TRIAL_DAYS,
  MIN_TRIAL_DAYS,
  TRIAL_ENDING_NOTICE_DAYS,
} from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { formatCents, techPayoutCents } from "@/lib/money";
import clientPays from "./images/step-client-pays.jpg";
export { clientPays };
import zoomBooked from "./images/zoom-booked.png";
import zoomClientPays from "./images/zoom-client-pays.png";
import zoomNoShow from "./images/zoom-no-show.png";
import zoomPayLink from "./images/zoom-pay-link.png";
import type { PageStyleId } from "@/lib/page-styles";
import { ClockStory } from "./clock-story";
import { HeroStage } from "./hero-stage";
import { LandingTag } from "./landing-tag";
import { NoShowCalculator } from "./no-show-calculator";
import { PageShowcase } from "./page-showcase";
import { StickyCta } from "./sticky-cta";
import "./landing.css";

/** One weight, for this page's headings only: the app's copy has more axes and isn't preloaded. */
const landingDisplay = Bricolage_Grotesque({
  weight: "800",
  subsets: ["latin"],
  variable: "--font-landing",
});

/** Every pro gets a menu page at the root of the site, e.g. getdibs.pro/fresh-cuts. */
const PAGE_HOST = new URL(publicEnv().NEXT_PUBLIC_APP_URL).host;

const price = formatCents(SUBSCRIPTION_PRICE_CENTS).replace(".00", "");
const SAMPLE_DEPOSIT = 4000;
const START = `Start free for ${TRIAL_DAYS} days`;
const HERO_NOTE = `Then ${price}/month. No card for your first pay link.`;
const CARD_NOTE = `No card for your first pay link. You add one for the next, and you're not charged until the trial ends.`;

/**
 * Wording for visitors from one trade's ads (proxy.ts shows /detailers to the
 * Detailers ad set). Everything not set here is the trade-neutral homepage.
 */
export type LandingNiche = {
  /** lib/trades.ts id: sign-up skips "What do you do?" and starts with its services. */
  trade: string;
  /** Wrap the word to strike through in <HeroStrike>. */
  headline: ReactNode;
  /** Who it's for, and that the first pay link is free. */
  heroLine: string;
  /** The deposit on the sample pay link ("$60"). */
  deposit: string;
  /** The business on the sample pay link and in the clock. */
  sampleName: string;
  /** The hero's two messages, then the clock's lead and three messages. */
  flake: [string, string];
  clockLead: string;
  clockExcuses: [string, string, string];
  costHeading: string;
  costBody: string;
  calculatorPrice: number;
  /** The phone's sample page (app/demo/sample/…) and the looks shown first. */
  samplePath: string;
  sampleAddress: string;
  styles: PageStyleId[];
  faq: { q: string; a: string }[];
  finalHeading: string;
};

export function Landing({ niche }: { niche?: LandingNiche }) {
  const SIGN_UP = niche ? `/start?trade=${niche.trade}` : "/start";
  const deposit = niche?.deposit ?? "$40";
  const business = niche?.sampleName ?? "Studio Nova";
  return (
    <div data-theme="dark" className={`landing ${landingDisplay.variable} flex flex-1 flex-col`}>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-1">
        <span className="text-2xl font-extrabold tracking-[-0.05em]">
          {APP_NAME.toLowerCase()}
          <span className="text-pink">.</span>
        </span>
        <Link
          href="/login"
          className="text-brand inline-flex min-h-12 items-center px-2 font-medium"
        >
          Sign in
        </Link>
      </header>

      <main className="flex flex-col">
        {/* Hero: the words and the button first, then a pay link to try. Motion only adds to it. */}
        <section className="hero-play mx-auto grid w-full max-w-5xl items-center gap-7 px-5 pt-3 pb-10 md:grid-cols-2 md:gap-10 md:pt-12">
          <div className="flex flex-col gap-3">
            <h1>
              {niche?.headline ?? (
                <>
                  No more getting <HeroStrike>ghosted</HeroStrike> by clients.
                </>
              )}
            </h1>
            <p className="text-foreground/85 text-lg leading-snug">
              {niche?.heroLine ??
                "Deposit pay links for pros who book in their DMs. Your first one is free."}
            </p>
            <div className="mt-1 flex flex-col" data-cta="hero">
              <ButtonLink href={SIGN_UP}>{START}</ButtonLink>
            </div>
            <p className="text-muted text-center text-sm md:text-left">{HERO_NOTE}</p>
          </div>
          <HeroStage
            business={business}
            deposit={deposit}
            flake={niche?.flake ?? ["omw!!", "something came up"]}
          />
          <ul className="text-muted flex flex-col gap-2 text-sm md:col-span-2 md:flex-row md:justify-center md:gap-6">
            <Check>Keep your Cash App, Zelle or Venmo</Check>
            <Check>Clients don&apos;t need an app</Check>
            <Check>Ready in 2 minutes</Check>
          </ul>
        </section>

        {/* A no-show, by the clock. */}
        <ClockStory
          lead={niche?.clockLead ?? "Your 2:00 is on the way."}
          excuses={niche?.clockExcuses ?? ["omw!!", "something came up", "my car won't start"]}
          deposit={deposit}
          business={business}
        />

        {/* Their own page: the interactive hook */}
        <section className="bg-surface border-line overflow-x-clip border-y">
          <div className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-14 md:grid-cols-2 md:items-center md:gap-10">
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-brand text-sm font-bold tracking-[0.12em] uppercase">
                Included free
              </p>
              <h2 className="text-3xl font-bold tracking-tight">Plus a page that sells for you.</h2>
              <p className="text-muted">
                Your services, prices and policy at{" "}
                <strong className="text-foreground">{PAGE_HOST}/yourname</strong>, styled your way.
                Put it in your bio and clients message you ready to book.{" "}
                <strong className="text-foreground">Try it: pick a style and a color.</strong>
              </p>
            </div>
            {/* min-w-0: the swipe rows inside must scroll, not widen the column. */}
            <div className="min-w-0">
              <PageShowcase
                address={niche?.sampleAddress ?? `${PAGE_HOST}/studio-nova`}
                previewPath={niche?.samplePath}
                styles={niche?.styles}
              />
            </div>
          </div>
        </section>

        {/* The cost */}
        <section className="bg-surface border-line border-y">
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-14 md:grid-cols-2 md:items-center">
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl font-bold tracking-tight">
                {niche?.costHeading ?? "A no-show costs more than the appointment."}
              </h2>
              <p className="text-muted">
                {niche?.costBody ??
                  "It's the hours you blocked, the prep you did, and the client you turned away for that slot. Most no-shows aren't personal: people forget, or nothing makes them feel committed. A paid deposit and a reminder fix both."}
              </p>
              <p className="text-muted">See what it adds up to for you:</p>
            </div>
            <NoShowCalculator
              priceCents={SUBSCRIPTION_PRICE_CENTS}
              appName={APP_NAME}
              initialPrice={niche?.calculatorPrice}
            />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto w-full max-w-5xl scroll-mt-4 px-5 py-14">
          <h2 className="text-3xl font-bold tracking-tight">From DM to deposit in 30 seconds</h2>
          <p className="text-muted mt-2 text-lg">
            Keep booking the way you already do. {APP_NAME} adds the deposit.
          </p>
          <ol className="mt-10 grid gap-14 md:grid-cols-2">
            <Step
              n={1}
              title="Create a pay link in seconds"
              body="Pick the service and time, then paste the link into your chat."
              image={zoomPayLink}
              alt="Appointment created: a ready-made message with the pay link and a Share pay link button"
            />
            <Step
              n={2}
              title="They agree to your policy and pay"
              body="Cash App, Zelle, Venmo or card. No app, no account."
              image={zoomClientPays}
              alt="The client's pay page: your deposit policy, an I agree checkbox and Pay $40.00 deposit"
            />
            <Step
              n={3}
              title="They're booked and reminded"
              body="Reminders 48 and 24 hours before. Cancel in time, they get it back."
              image={zoomBooked}
              alt="The client's ticket stamped Booked: deposit paid and confirmation emailed"
            />
            <Step
              n={4}
              title="No-show? One tap"
              body="You keep the deposit, and they get a polite email. No chasing."
              image={zoomNoShow}
              alt="Did Jordan show up? Yes, completed, or No-show, keep deposit"
            />
          </ol>
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <p className="text-muted">See it the way your client will, no sign-up needed.</p>
            <ButtonLink href="/demo" variant="secondary">
              Try a demo pay link
            </ButtonLink>
          </div>
        </section>

        {/* Comparison */}
        <section className="bg-surface border-line border-y">
          <div className="mx-auto w-full max-w-5xl px-5 py-14">
            <h2 className="text-3xl font-bold tracking-tight">
              Keep your Cash App. Add what it&apos;s missing.
            </h2>
            <p className="text-muted mt-2 max-w-2xl">
              Payment apps take the money but don&apos;t protect you. {APP_NAME} adds the protection
              to the way you already book and get paid.
            </p>
            <div className="border-line bg-background mt-8 overflow-hidden rounded-2xl border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-line border-b">
                    <th className="p-3 font-medium">&nbsp;</th>
                    <th className="w-16 px-1 py-3 text-center text-xs font-medium sm:w-auto sm:px-3">
                      Cash App alone
                    </th>
                    <th className="text-brand bg-brand-soft/50 w-16 px-1 py-3 text-center text-xs font-bold sm:w-auto sm:px-3">
                      {APP_NAME}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <Row label="Keep booking in your DMs or texts" cash />
                  <Row label="Clients pay with Cash App, Zelle or Venmo" cash />
                  <Row label="Client agrees to your policy before paying" cash={false} />
                  <Row label="Automatic reminders" cash={false} />
                  <Row label="Refund or keep, decided by your policy" cash={false} />
                  <Row label="One tap to keep a no-show's deposit" cash={false} />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="mx-auto w-full max-w-md scroll-mt-4 px-5 py-14 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight">One price. Everything included.</h2>
          <div className="border-brand bg-surface mt-6 flex flex-col gap-4 rounded-3xl border-2 p-6 shadow-sm">
            <p>
              <span className="text-5xl font-bold">{price}</span>
              <span className="text-muted">/month</span>
            </p>
            <p className="font-medium">
              Free for {TRIAL_DAYS} days. Cancel anytime from your phone.
            </p>
            <p className="bg-brand-soft/60 rounded-xl px-3 py-2 text-sm font-medium">
              One kept {formatCents(SAMPLE_DEPOSIT).replace(".00", "")} deposit covers the month.
            </p>
            <ul className="flex flex-col gap-2 text-left text-sm">
              <Check>Unlimited pay links and clients</Check>
              <Check>Your policy, agreed in writing before they pay</Check>
              <Check>Automatic reminders and confirmations</Check>
              <Check>Client cancellations with automatic refund rules</Check>
              <Check>One-tap no-show, keep the deposit</Check>
              <Check>
                Your own page for your Instagram bio, {PAGE_HOST}/yourname: your services, prices
                and policy
              </Check>
              <Check>No marketplace: your clients never see other pros</Check>
            </ul>
            <p className="text-muted text-sm">
              No fees on deposits paid with Cash App, Zelle or Venmo. Card deposits are{" "}
              {PROCESSING_FEE_LABEL}: on a {formatCents(SAMPLE_DEPOSIT)} deposit you receive{" "}
              {formatCents(techPayoutCents(SAMPLE_DEPOSIT))}.
            </p>
            <div data-cta="pricing">
              <ButtonLink href={SIGN_UP} className="w-full sm:w-full">
                {START}
              </ButtonLink>
            </div>
            <p className="text-muted text-xs">{CARD_NOTE}</p>
          </div>
          <ul className="text-muted mx-auto mt-6 flex w-fit flex-col gap-2 text-left text-sm">
            <Check>
              An email {TRIAL_ENDING_NOTICE_DAYS} days before your trial ends, with what {APP_NAME}{" "}
              saved you
            </Check>
            <Check>Card payments processed by Stripe</Check>
            <Check>Cash App, Zelle and Venmo deposits go straight to you</Check>
            <Check>Your clients&apos; details are never shared with advertisers</Check>
          </ul>
        </section>

        {/* FAQ */}
        <section className="bg-surface border-line border-y">
          <div className="mx-auto w-full max-w-2xl px-5 py-14">
            <h2 className="text-3xl font-bold tracking-tight">Questions</h2>
            <div className="mt-6 flex flex-col">
              {niche?.faq.map((f) => (
                <Faq key={f.q} q={f.q}>
                  {f.a}
                </Faq>
              ))}
              <Faq q="Won't asking for a deposit scare clients off?">
                Clients who plan to show up don&apos;t mind a deposit that goes toward their
                appointment; it tells them you&apos;re booked and their spot is really held. The
                ones who push back are usually the ones who would have no-showed. You set the
                amount, and you can change it for any client.
              </Faq>
              <Faq q="What if a regular doesn't want to pay a deposit?">
                You decide per client. When you create their pay link you can lower the deposit,
                down to $1, for someone you trust. Most clients are fine once they see it goes
                toward their appointment and comes back if they cancel in time.
              </Faq>
              <Faq q="Do my clients need to download anything or make an account?">
                No. They tap the link you send, read your policy, and pay with your Cash App, Zelle
                or Venmo, or by card, Apple Pay or Google Pay if you take cards. That&apos;s it.
              </Faq>
              <Faq q="How do I get paid?">
                Your choice. Clients send the deposit straight to your Cash App, Zelle or Venmo, and
                you tap Received when it lands. Or connect Stripe (about 5 minutes) and card
                deposits go to your bank automatically.
              </Faq>
              <Faq q="What happens when a client cancels?">
                If they cancel before your cancellation window (for example, 48 hours before), their
                deposit is refunded: automatically for card deposits, or we remind you to send it
                back on Cash App, Zelle or Venmo. If it&apos;s later than that, you keep it. Either
                way, you get a notification so you can fill the spot.
              </Faq>
              <Faq q="What if a client doesn't show up?">
                After the appointment time, tap &ldquo;No-show, keep deposit.&rdquo; The client gets
                an email saying the deposit was kept per your policy, which they agreed to before
                paying.
              </Faq>
              <Faq q="What if a client disputes a card deposit with their bank?">
                We automatically send the bank the policy your client agreed to, with the date and
                time they agreed, and the confirmation and reminders they received. That&apos;s the
                proof banks look for.
              </Faq>
              <Faq q="Do I need to change how I book?">
                No. Keep booking in your DMs or by text. {APP_NAME} just adds the deposit link,
                reminders and policy on top.
              </Faq>
              <Faq q="What does it cost?">
                {price}/month after a {TRIAL_DAYS}-day free trial. No fees on Cash App, Zelle or
                Venmo deposits; card deposits are {PROCESSING_FEE_LABEL}. No contract. Cancel
                anytime from your billing page.
              </Faq>
              <Faq q="Do I need a card to try it?">
                Not to sign up, and not for your first pay link. You add a card when you send your
                second, and you won&apos;t be charged until {TRIAL_DAYS} days after you signed up
                (at least {MIN_TRIAL_DAYS} days after adding the card). We email you{" "}
                {TRIAL_ENDING_NOTICE_DAYS} days before it ends, and you can cancel from your phone.
              </Faq>
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="bg-brand text-brand-foreground">
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-5 py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              {niche?.finalHeading ?? "Lock in your next client before they can ghost."}
            </h2>
            <p className="opacity-90">
              Pick what you do and we fill in starter services. Send your first deposit link today.
            </p>
            <Link
              href={SIGN_UP}
              data-cta="final"
              className="bg-surface text-brand inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 font-semibold sm:w-auto"
            >
              {START}
            </Link>
            <Link href="/demo" className="inline-flex min-h-12 items-center underline">
              Or try a demo pay link first
            </Link>
          </div>
        </section>
      </main>

      <footer className="text-muted mx-auto flex w-full max-w-5xl flex-col gap-2 px-5 py-8 pb-[max(6rem,env(safe-area-inset-bottom))] text-sm sm:flex-row sm:justify-between md:pb-8">
        <span>© {APP_NAME}</span>
        <div className="flex gap-4">
          <Link href="/terms" className="underline">
            Terms
          </Link>
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </footer>

      {niche && <LandingTag trade={niche.trade} />}
      <StickyCta href={SIGN_UP} label={START} note={`Then ${price}/month · cancel anytime`} />
    </div>
  );
}

/** The headline's struck word: the line draws through it once the sample pay link is stamped. */
export function HeroStrike({ children }: { children: ReactNode }) {
  return <span className="hero-strike">{children}</span>;
}

function Check({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-success font-bold" aria-hidden>
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function Step({
  n,
  title,
  body,
  image,
  alt,
}: {
  n: number;
  title: string;
  body: string;
  image: StaticImageData;
  alt: string;
}) {
  return (
    <li className="flex flex-col gap-4">
      <div className="flex gap-4">
        <span className="bg-brand text-brand-foreground flex size-9 shrink-0 items-center justify-center rounded-full font-bold">
          {n}
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-foreground/85 text-lg">{body}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 md:max-w-sm">
        <Image
          src={image}
          alt={alt}
          sizes="(min-width: 768px) 384px, 100vw"
          placeholder="blur"
          className="h-auto w-full"
        />
      </div>
    </li>
  );
}

function Mark({ yes }: { yes: boolean }) {
  return yes ? (
    <span className="text-success font-bold" aria-label="Yes">
      ✓
    </span>
  ) : (
    <span className="text-muted" aria-label="No">
      ✗
    </span>
  );
}

function Row({ label, cash }: { label: string; cash: boolean }) {
  return (
    <tr className="border-line border-b last:border-0">
      <td className="p-3">{label}</td>
      <td className="p-3 text-center">
        <Mark yes={cash} />
      </td>
      <td className="bg-brand-soft/50 p-3 text-center">
        <Mark yes />
      </td>
    </tr>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="border-line group border-b py-2">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-medium">
        {q}
        <span aria-hidden className="text-muted transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="text-muted pb-3">{children}</p>
    </details>
  );
}
