import type { Metadata, Viewport } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { CopyLink } from "@/components/ui/copy-link";
import {
  APP_NAME,
  depositAnnouncement,
  FOUNDER_NAME,
  LEGAL_CONTACT_EMAIL,
  PROCESSING_FEE_LABEL,
  REMINDER_OFFSETS_HOURS,
  SUBSCRIPTION_PRICE_CENTS,
  TRIAL_DAYS,
  TRIAL_ENDING_NOTICE_DAYS,
} from "@/lib/config";
import { formatCents, techPayoutCents } from "@/lib/money";
import clientPays from "./images/step-client-pays.jpg";
import zoomBooked from "./images/zoom-booked.png";
import zoomClientPays from "./images/zoom-client-pays.png";
import zoomNoShow from "./images/zoom-no-show.png";
import zoomPayLink from "./images/zoom-pay-link.png";
import { NoShowCalculator } from "./no-show-calculator";
import { StickyCta } from "./sticky-cta";

export const metadata: Metadata = {
  title: {
    absolute: `${APP_NAME}: deposits and no-show protection for pros who book in their DMs`,
  },
  description:
    "Send a deposit link in your DMs or texts. Clients agree to your policy and pay with your Cash App, Zelle, Venmo or a card before the slot is theirs. Automatic reminders. No-show? Keep the deposit.",
  openGraph: {
    title: "Stop losing money to no-shows",
    description:
      "Deposit links for pros who book in their DMs. Clients agree to your policy, get reminders, and you keep the deposit on a no-show.",
    images: [clientPays.src],
  },
};

export const viewport: Viewport = { themeColor: "#0d0b0c" };

const price = formatCents(SUBSCRIPTION_PRICE_CENTS).replace(".00", "");
const SAMPLE_DEPOSIT = 4000;
const START = `Start free for ${TRIAL_DAYS} days`;
// Every "Start free" goes to instant sign-up (StartSignup and Lead Pixel events fire there).
const SIGN_UP = "/start";
const ANNOUNCEMENT = depositAnnouncement(48);
const HERO_NOTE = `Then ${price}/month, cancel anytime. You add a card before your first pay link, and you're not charged until the trial ends.`;
const CARD_NOTE = `You add a card before your first pay link. You're not charged until the trial ends.`;

export default function HomePage() {
  return (
    <div data-theme="dark" className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
        <span className="flex items-center gap-2 text-lg font-bold">
          <span className="bg-brand size-2.5 rounded-full" aria-hidden />
          {APP_NAME}
        </span>
        <Link
          href="/login"
          className="text-brand inline-flex min-h-12 items-center px-2 font-medium"
        >
          Sign in
        </Link>
      </header>

      <main className="flex flex-col">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-5xl items-center gap-8 px-5 pt-2 pb-14 md:grid-cols-2 md:gap-10 md:pt-12">
          <div className="flex flex-col gap-5">
            <p className="bg-brand-soft text-brand self-start rounded-full px-3 py-1 text-sm font-semibold">
              {TRIAL_DAYS} days free · No card to sign up
            </p>
            <h1 className="text-[2.5rem] leading-[1.05] font-bold tracking-tight md:text-6xl">
              Stop losing money to <span className="whitespace-nowrap">no-shows.</span>
            </h1>
            <p className="text-muted text-lg">
              Send a deposit link in your DMs or texts. Clients agree to your policy and pay before
              the slot is theirs. If they don&apos;t show, you keep the deposit.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row" data-cta="hero">
              <ButtonLink href={SIGN_UP}>{START}</ButtonLink>
              <ButtonLink href="/demo" variant="secondary">
                Try a demo pay link
              </ButtonLink>
            </div>
            <p className="text-muted text-sm">{HERO_NOTE}</p>
          </div>
          <HeroVisual />
          <ul className="text-muted flex flex-wrap gap-x-4 gap-y-2 text-sm md:col-span-2 md:justify-center">
            <Check>Keep your Cash App, Zelle or Venmo</Check>
            <Check>Cards by Stripe</Check>
            <Check>Clients don&apos;t need an app</Check>
            <Check>Ready in 2 minutes</Check>
            <Check>Cancel anytime</Check>
          </ul>
        </section>

        {/* The cost */}
        <section className="bg-surface border-line border-y">
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-14 md:grid-cols-2 md:items-center">
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl font-bold tracking-tight">
                A no-show costs more than the appointment.
              </h2>
              <p className="text-muted">
                It&apos;s the hours you blocked, the prep you did, and the client you turned away
                for that slot. Most no-shows aren&apos;t personal: people forget, or nothing makes
                them feel committed. A paid deposit and a reminder fix both.
              </p>
              <p className="text-muted">See what it adds up to for you:</p>
            </div>
            <NoShowCalculator priceCents={SUBSCRIPTION_PRICE_CENTS} appName={APP_NAME} />
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
              alt="Appointment created: a pay link with a Copy pay link button"
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
              alt="The client's confirmation: deposit paid, with the last day to cancel for a refund"
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
              Payment apps take money but don&apos;t protect you. Booking apps protect you but make
              your clients use a booking site and pay through their checkout. {APP_NAME} adds the
              protection to the way you already book and get paid.
            </p>
            <div className="border-line bg-background mt-8 overflow-hidden rounded-2xl border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-line border-b">
                    <th className="p-3 font-medium">&nbsp;</th>
                    <th className="w-16 px-1 py-3 text-center text-xs font-medium sm:w-auto sm:px-3">
                      Cash App alone
                    </th>
                    <th className="w-16 px-1 py-3 text-center text-xs font-medium sm:w-auto sm:px-3">
                      Most booking apps
                    </th>
                    <th className="text-brand bg-brand-soft/50 w-16 px-1 py-3 text-center text-xs font-bold sm:w-auto sm:px-3">
                      {APP_NAME}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <Row label="Keep booking in your DMs or texts" cash booking={false} />
                  <Row label="Clients pay with Cash App, Zelle or Venmo" cash booking={false} />
                  <Row label="Client agrees to your policy before paying" cash={false} booking />
                  <Row label="Automatic reminders" cash={false} booking />
                  <Row label="Refund or keep, decided by your policy" cash={false} booking />
                  <Row label="One tap to keep a no-show's deposit" cash={false} booking />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* The awkward part */}
        <section className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-14 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-bold tracking-tight">
              Deposits, without the awkward conversation.
            </h2>
            <p className="text-muted">
              The hard part was never the money. It&apos;s asking for it, and enforcing it when
              someone flakes. {APP_NAME} does that part, so your policy is the bad guy, not you.
            </p>
            <ul className="flex flex-col gap-3">
              <Check>
                <strong>Your policy does the talking.</strong> Clients agree to it before they pay,
                so there&apos;s nothing to argue about in the DMs.
              </Check>
              <Check>
                <strong>You never chase anyone.</strong> Reminders go out on their own, and so does
                the polite &ldquo;you missed your appointment&rdquo; email.
              </Check>
              <Check>
                <strong>It feels fair, not greedy.</strong> Clients who cancel in time get their
                deposit back, and they see that up front.
              </Check>
            </ul>
          </div>
          <div className="border-line bg-surface flex flex-col gap-3 rounded-3xl border p-5">
            <p className="font-semibold">Starting deposits? Send your clients this:</p>
            <CopyLink url={ANNOUNCEMENT} label="Copy this message" prose />
            <p className="text-muted text-xs">
              Edit it however you like. Change 48 hours to your policy.
            </p>
          </div>
        </section>

        {/* What clients get */}
        <section className="bg-surface border-line border-y">
          <div className="mx-auto w-full max-w-5xl px-5 py-14">
            <h2 className="text-3xl font-bold tracking-tight">
              Your clients get the full experience.
            </h2>
            <p className="text-muted mt-2 max-w-2xl">
              A Cash App request says &ldquo;send money.&rdquo; A {APP_NAME} pay link says you run a
              real business: every booking comes with a confirmation, a calendar invite, reminders
              and an easy way to cancel instead of ghosting.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <ClientPerk
                title="A confirmation email"
                body="The moment their deposit is in, with the time, the price and when they can still cancel."
              >
                <p className="text-muted text-xs">From: Studio Nova</p>
                <p className="font-semibold">You&apos;re booked with Studio Nova</p>
                <p className="text-muted text-sm">Sat at 2:00 PM · $40 deposit paid</p>
              </ClientPerk>
              <ClientPerk
                title="A calendar invite + reminders"
                body={`One tap adds it to their calendar, and reminders go out ${REMINDER_OFFSETS_HOURS.join(" and ")} hours before.`}
              >
                <p className="text-brand text-xs font-semibold">SATURDAY</p>
                <p className="font-semibold">Appointment with Studio Nova</p>
                <p className="text-muted text-sm">2:00 – 3:00 PM · alert 2 hours before</p>
              </ClientPerk>
              <ClientPerk
                title="One tap to cancel"
                body="Can't make it? They cancel from the same link, and your policy decides the refund."
              >
                <p className="text-muted text-sm">
                  Can&apos;t make it? Cancel by Thu 2:00 PM to get your deposit back.
                </p>
                <span className="border-line bg-surface text-foreground mt-1 inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold">
                  Cancel my appointment
                </span>
              </ClientPerk>
            </div>
          </div>
        </section>

        {/* Founder note */}
        <section className="mx-auto w-full max-w-2xl px-5 pb-4">
          <figure className="border-line bg-surface flex flex-col gap-4 rounded-3xl border p-6">
            <p className="text-brand text-xs font-semibold tracking-wide uppercase">
              A note from the founder
            </p>
            <blockquote className="flex flex-col gap-3 text-lg">
              <p>
                I built {APP_NAME} for pros who run their whole business from their phone and are
                tired of holding a slot for someone who never shows up.
              </p>
              <p>
                There&apos;s no sales team and no contract. If something doesn&apos;t work the way
                you need, email me and I&apos;ll answer it myself.
              </p>
            </blockquote>
            <figcaption className="flex flex-col gap-1">
              <span className="font-semibold">
                {FOUNDER_NAME}, founder of {APP_NAME}
              </span>
              <a
                href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                className="text-brand inline-flex min-h-12 items-center self-start underline"
              >
                {LEGAL_CONTACT_EMAIL}
              </a>
            </figcaption>
          </figure>
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
              <Check>A menu page for your Instagram bio: your services, prices and policy</Check>
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
                Not to sign up. You add a card when you&apos;re ready to send your first pay link,
                and you won&apos;t be charged until your {TRIAL_DAYS}-day trial ends. We email you{" "}
                {TRIAL_ENDING_NOTICE_DAYS} days before it ends, and you can cancel from your phone.
              </Faq>
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="bg-brand text-brand-foreground">
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-5 py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Your next no-show is already on your calendar.
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

      <StickyCta href={SIGN_UP} label={START} note={`Then ${price}/month · cancel anytime`} />
    </div>
  );
}

/** The DM that sends the link, above the page the client opens. */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div className="mb-4 flex flex-col gap-2 text-[15px]" aria-hidden>
        <p className="bg-surface border-line max-w-[78%] self-start rounded-2xl rounded-bl-md border px-4 py-2.5 shadow-sm">
          Can I get Saturday at 2? 🙏
        </p>
        <p className="bg-brand text-brand-foreground max-w-[78%] self-end rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm">
          Yes! Lock it in here 👇
        </p>
        <p className="bg-surface border-line max-w-[78%] self-end rounded-2xl rounded-br-md border px-4 py-2.5 shadow-sm">
          <span className="block font-semibold">Pay your $40 deposit</span>
          <span className="text-brand text-sm">getdibs.pro/pay/…</span>
        </p>
      </div>
      <Phone
        src={clientPays}
        alt="A client's pay page: appointment details, deposit policy, and a button to pay the $40 deposit"
        eager
      />
    </div>
  );
}

function Phone({
  src,
  alt,
  eager = false,
}: {
  src: StaticImageData;
  alt: string;
  eager?: boolean;
}) {
  return (
    <div className="border-ink mx-auto w-full max-w-[280px] overflow-hidden rounded-[2.25rem] border-[7px] shadow-xl ring-1 ring-white/15">
      <Image
        src={src}
        alt={alt}
        sizes="280px"
        placeholder="blur"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        className="h-auto w-full"
      />
    </div>
  );
}

/** A small mock of something the client receives, with what it is underneath. */
function ClientPerk({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div data-theme="light" className="flex flex-col gap-1 rounded-2xl p-4 shadow-lg">
        {children}
      </div>
      <p className="font-semibold">{title}</p>
      <p className="text-muted text-sm">{body}</p>
    </div>
  );
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

function Row({ label, cash, booking }: { label: string; cash: boolean; booking: boolean }) {
  return (
    <tr className="border-line border-b last:border-0">
      <td className="p-3">{label}</td>
      <td className="p-3 text-center">
        <Mark yes={cash} />
      </td>
      <td className="p-3 text-center">
        <Mark yes={booking} />
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
