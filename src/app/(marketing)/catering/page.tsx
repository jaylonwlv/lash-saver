import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { APP_NAME, PROCESSING_FEE_LABEL, SUBSCRIPTION_PRICE_CENTS, TRIAL_DAYS } from "@/lib/config";
import { formatCents } from "@/lib/money";
import { StickyCta } from "../sticky-cta";

/*
 * Landing page for food trucks and caterers (Meta ads point here). The one
 * marketing page that names a trade, on purpose: the rest stay trade-neutral.
 * Every claim must stay true to the product (lib/catering, config.ts).
 */

const price = formatCents(SUBSCRIPTION_PRICE_CENTS).replace(".00", "");
const SIGN_UP = "/start?trade=catering";
const START = `Start free for ${TRIAL_DAYS} days`;
const NOTE = `No card to sign up. Your first booking is free; add a card for the next, and you're not charged until the trial ends. Then ${price}/month.`;

export const metadata: Metadata = {
  title: { absolute: `${APP_NAME} Catering: turn catering DMs into booked, paid events` },
  description:
    "A quote page for your food truck. Hosts pick a date and guest count, see your price, and pay a deposit to hold the date. No commission on your bookings.",
  openGraph: {
    title: "Turn catering DMs into booked, paid events",
    description:
      "Hosts get your price in a minute and pay a deposit to hold the date. No commission.",
  },
};

export const viewport: Viewport = { themeColor: "#0d0b0c" };

export default function CateringLandingPage() {
  return (
    <div data-theme="dark" className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
        <span className="flex items-center gap-2 text-lg font-bold">
          <span className="bg-brand size-2.5 rounded-full" aria-hidden />
          {APP_NAME} <span className="text-muted font-medium">Catering</span>
        </span>
        <Link
          href="/login"
          className="text-brand inline-flex min-h-12 items-center px-2 font-medium"
        >
          Sign in
        </Link>
      </header>

      <main className="flex flex-col">
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 pt-4 pb-14 md:pt-12">
          <p className="bg-brand-soft text-brand self-start rounded-full px-3 py-1 text-sm font-semibold">
            For food trucks & caterers 🚚
          </p>
          <h1 className="text-[2.5rem] leading-[1.05] font-bold tracking-tight md:text-6xl">
            Turn catering DMs into booked, paid events.
          </h1>
          <p className="text-muted text-lg">
            &ldquo;How much for 80 people on June 14?&rdquo; Send one link. Hosts pick their date
            and guest count, see your price, and pay a deposit to hold the date, while you&apos;re
            still on the line.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row" data-cta="hero">
            <ButtonLink href={SIGN_UP}>{START}</ButtonLink>
            <ButtonLink href="/catering/demo" variant="secondary">
              See a sample quote page
            </ButtonLink>
          </div>
          <p className="text-muted text-sm">{NOTE}</p>
          <ul className="text-muted flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Check>No commission on bookings</Check>
            <Check>Hosts don&apos;t need an account</Check>
            <Check>Payouts to your bank by Stripe</Check>
            <Check>Cancel anytime</Check>
          </ul>
        </section>

        <section className="bg-surface border-line border-y">
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-14 md:grid-cols-3">
            <Point emoji="🧮" title="Instant quotes by guest count">
              Per-person or flat packages, add-ons, minimum spend, extra hours, travel, service fee
              and tax. Hosts see the exact total before they pay, down to the cent.
            </Point>
            <Point emoji="📅" title="Deposits that hold the date">
              Booked dates close on your page automatically, so nobody double-books you. The balance
              is due when you choose, with reminders sent for you.
            </Point>
            <Point emoji="📲" title="One link for your bio">
              Put it in your Instagram bio and paste it in every &ldquo;how much?&rdquo; DM. New
              bookings land in your email and your phone&apos;s calendar.
            </Point>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 py-14">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <ol className="mt-8 flex flex-col gap-6">
            <Step n={1} title="Set your packages and prices (5 minutes)">
              Start from our examples, like a per-person buffet and a flat truck rental. Set your
              deposit, minimum spend and how far ahead you book.
            </Step>
            <Step n={2} title="Send your link">
              Hosts pick a date, guests and a package, and see the total and the deposit due today.
            </Step>
            <Step n={3} title="They pay, you're booked">
              The host agrees to your policy and pays by card. You both get an email, and the date
              closes on your page.
            </Step>
            <Step n={4} title="The balance comes in on time">
              We remind the host before the balance is due and tell you if it&apos;s late. The day
              before the event, you get a summary: time, address, guests, add-ons and notes.
            </Step>
          </ol>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row" data-cta="steps">
            <ButtonLink href={SIGN_UP}>{START}</ButtonLink>
          </div>
        </section>

        <section className="bg-surface border-line border-y">
          <div className="mx-auto w-full max-w-3xl px-5 py-14">
            <h2 className="text-3xl font-bold tracking-tight">Pricing</h2>
            <p className="mt-4 text-4xl font-bold">
              {price}
              <span className="text-muted text-lg font-medium">/month</span>
            </p>
            <ul className="text-muted mt-4 flex flex-col gap-2">
              <Check>{TRIAL_DAYS}-day free trial, cancel anytime</Check>
              <Check>No commission: your package prices are yours</Check>
              <Check>
                Card processing: {PROCESSING_FEE_LABEL} per payment, taken from that payment
              </Check>
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 py-14">
          <h2 className="text-3xl font-bold tracking-tight">Questions</h2>
          <div className="mt-6 flex flex-col">
            <Faq q="What does it cost?">
              {price}/month after a {TRIAL_DAYS}-day free trial. We don&apos;t take a cut of your
              bookings. Card payments have a {PROCESSING_FEE_LABEL} processing fee, taken from each
              payment before it reaches you.
            </Faq>
            <Faq q="How do I get paid?">
              Through Stripe, straight to your bank account. You connect Stripe once during setup.
            </Faq>
            <Faq q="Do hosts need an account?">
              No. They open your link, pick their date and pay. They get an email with a link to
              their booking, where they can pay the balance and add the event to their calendar.
            </Faq>
            <Faq q="How do cancellations work?">
              You set the rules: whether hosts can cancel online, and how many days before the event
              they get a full refund (after that, you keep the deposit). Refunds happen
              automatically. If you cancel, the host gets everything back.
            </Faq>
            <Faq q="Do hosts sign a contract?">
              Yes. Before paying, hosts e-sign an agreement with their event, price, payment
              schedule, refund rules, your policy and any terms you add. You both get a copy, and it
              stays on the booking.
            </Faq>
            <Faq q="Can two people book the same date?">
              No. A date is held while a host pays, and closes once they do. If you take more than
              one event a day, set how many.
            </Faq>
          </div>
        </section>
      </main>
      <StickyCta href={SIGN_UP} label={START} note={`Then ${price}/month · cancel anytime`} />
    </div>
  );
}

function Check({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-brand" aria-hidden>
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function Point({ emoji, title, children }: { emoji: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-3xl" aria-hidden>
        {emoji}
      </p>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-muted">{children}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="bg-brand text-brand-foreground flex size-9 shrink-0 items-center justify-center rounded-full font-bold">
        {n}
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="font-bold">{title}</h3>
        <p className="text-muted">{children}</p>
      </div>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="border-line group border-b py-2">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 font-semibold">
        {q}
        <span className="text-muted transition-transform group-open:rotate-45" aria-hidden>
          +
        </span>
      </summary>
      <p className="text-muted pb-3">{children}</p>
    </details>
  );
}
