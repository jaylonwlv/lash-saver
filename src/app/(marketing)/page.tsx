import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { APP_NAME, PROCESSING_FEE_LABEL, SUBSCRIPTION_PRICE_CENTS, TRIAL_DAYS } from "@/lib/config";
import { formatCents, techPayoutCents } from "@/lib/money";
import booked from "./images/step-booked.jpg";
import clientPays from "./images/step-client-pays.jpg";
import noShow from "./images/step-no-show.jpg";
import payLink from "./images/step-pay-link.jpg";

export const metadata: Metadata = {
  title: {
    absolute: `${APP_NAME}: deposits and no-show protection for pros who book in their DMs`,
  },
  description:
    "Send a deposit link from your Instagram DMs. Clients agree to your policy and pay with Cash App, Zelle, Venmo or card to lock in their spot. Automatic reminders. No-show? Keep the deposit.",
  openGraph: {
    title: "Stop losing money to no-shows",
    description:
      "Deposit links for pros who book in their DMs. Clients agree to your policy, get reminders, and you keep the deposit on a no-show.",
    images: [clientPays.src],
  },
};

const price = formatCents(SUBSCRIPTION_PRICE_CENTS).replace(".00", "");
const SAMPLE_DEPOSIT = 4000;
const START = `Start free for ${TRIAL_DAYS} days`;

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
        <span className="font-semibold">{APP_NAME}</span>
        <Link
          href="/login"
          className="text-brand inline-flex min-h-12 items-center px-2 font-medium"
        >
          Sign in
        </Link>
      </header>

      <main className="flex flex-col">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-5xl items-center gap-10 px-5 pt-6 pb-14 md:grid-cols-2 md:pt-12">
          <div className="flex flex-col gap-5">
            <p className="text-brand text-sm font-semibold tracking-wide uppercase">
              For pros who book in their DMs
            </p>
            <h1 className="text-4xl leading-tight font-bold md:text-5xl">
              Stop losing money to no-shows.
            </h1>
            <p className="text-muted text-lg">
              Send a deposit link right from your Instagram DMs. Clients agree to your policy and
              pay with your Cash App, Zelle, Venmo or a card to call dibs on their spot. They get
              reminders. And if they don&apos;t show, you keep the deposit.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/login">{START}</ButtonLink>
              <ButtonLink href="#how-it-works" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
            <p className="text-muted text-sm">
              No card to sign up. Set up in about 2 minutes, right from your phone.
            </p>
          </div>
          <Phone
            src={clientPays}
            alt="A client's pay page: appointment details, deposit policy, and a button to pay the $40 deposit"
            eager
          />
        </section>

        {/* The cost of a no-show */}
        <section className="bg-surface border-line border-y">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-14">
            <h2 className="text-3xl font-bold">One no-show costs more than the set.</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat value="$150" label="gone when a $150 appointment doesn't show" />
              <Stat value="2+ hrs" label="of your day blocked for nothing" />
              <Stat value="$5,400" label="a year, at just 3 no-shows a month" />
            </div>
            <p className="text-muted max-w-2xl">
              Most no-shows aren&apos;t personal. Clients forget, or nothing makes them feel
              committed. A paid deposit and a reminder fix both, and you stop having the awkward
              &ldquo;about my policy&hellip;&rdquo; conversation.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto w-full max-w-5xl scroll-mt-4 px-5 py-14">
          <h2 className="text-3xl font-bold">From DM to deposit in 30 seconds</h2>
          <p className="text-muted mt-2 text-lg">Keep booking the way you already do.</p>
          <ol className="mt-10 grid gap-12 md:grid-cols-2">
            <Step
              n={1}
              title="Agree on a time in your DMs, then create a pay link"
              body="Pick the service, date and time. Copy the link and paste it into the chat."
              image={payLink}
              alt="The pro's screen after creating an appointment, with a Copy pay link button"
            />
            <Step
              n={2}
              title="Your client agrees to your policy and pays"
              body="They see the details and your cancellation policy, tick “I agree”, and pay with your Cash App, Zelle or Venmo, or by card. No account, no app to download."
              image={clientPays}
              alt="The client's pay page with the deposit policy and an agree checkbox"
            />
            <Step
              n={3}
              title="They're booked, and reminded"
              body="Confirmation right away, reminders 48 and 24 hours before. If they can't make it, they cancel instead of ghosting: early enough gets a refund, too late and you keep the deposit."
              image={booked}
              alt="The client's confirmation page with a Can't make it section"
            />
            <Step
              n={4}
              title="No-show? One tap, you keep the deposit"
              body="After the appointment, mark it completed or no-show. No chasing, no arguing."
              image={noShow}
              alt="The pro's appointment page asking Did Jada show up, with No-show, keep deposit"
            />
          </ol>
        </section>

        {/* Features */}
        <section className="bg-surface border-line border-y">
          <div className="mx-auto w-full max-w-5xl px-5 py-14">
            <h2 className="text-3xl font-bold">Everything a deposit should do</h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Feature title="Your policy, agreed in writing">
                Clients tick &ldquo;I agree&rdquo; before they pay, and it&apos;s saved with a
                timestamp. If a client disputes a kept deposit, you have the proof.
              </Feature>
              <Feature title="Automatic reminders">
                Emails 48 and 24 hours before, with the exact time they can still cancel for a
                refund. Forgetting stops being an excuse.
              </Feature>
              <Feature title="Cancel instead of ghost">
                Clients can cancel from their link. Early enough is refunded automatically, too late
                means you keep the deposit, and you get a heads-up to fill the slot.
              </Feature>
              <Feature title="One-tap no-show">
                Mark it and you keep the deposit. The client gets a polite email, so you don&apos;t
                have to write one.
              </Feature>
              <Feature title="Get paid your way">
                Keep your Cash App, Zelle or Venmo: clients pay you directly and you tap Received.
                Or take cards through Stripe and deposits land in your bank automatically.
              </Feature>
              <Feature title="Built for your phone">
                Everything works from your phone, and the pay link opens right inside Instagram.
              </Feature>
            </ul>
          </div>
        </section>

        {/* Comparison */}
        <section className="mx-auto w-full max-w-5xl px-5 py-14">
          <h2 className="text-3xl font-bold">Keep your Cash App. Add what it&apos;s missing.</h2>
          <p className="text-muted mt-2 max-w-2xl">
            Cash App works, until a client asks for their money back, forgets, or ghosts. Big
            booking apps are built around online calendars and marketplaces. {APP_NAME} adds real
            deposit protection to the way you already book and get paid: in your DMs.
          </p>
          <div className="border-line bg-surface mt-8 overflow-hidden rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-line border-b">
                  <th className="p-4 font-medium">&nbsp;</th>
                  <th className="p-4 text-center font-medium">Cash App or Zelle alone</th>
                  <th className="text-brand p-4 text-center font-semibold">With {APP_NAME}</th>
                </tr>
              </thead>
              <tbody>
                <Row label="Client agrees to your policy before paying" them={false} />
                <Row label="Automatic reminders" them={false} />
                <Row label="Refund or keep, decided by your policy" them={false} />
                <Row label="One tap to keep a no-show's deposit" them={false} />
                <Row label="Proof if a client disputes" them={false} />
                <Row label="Works from your DMs" them />
                <Row label="Clients pay with Cash App, Zelle or Venmo" them />
              </tbody>
            </table>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-surface border-line border-y">
          <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-14 text-center">
            <h2 className="text-3xl font-bold">Simple pricing</h2>
            <div className="border-brand bg-background flex flex-col gap-4 rounded-2xl border-2 p-6">
              <p>
                <span className="text-5xl font-bold">{price}</span>
                <span className="text-muted">/month</span>
              </p>
              <p className="font-medium">Free for {TRIAL_DAYS} days. Cancel anytime.</p>
              <ul className="text-muted flex flex-col gap-2 text-left text-sm">
                <li>✓ Unlimited pay links and clients</li>
                <li>✓ Automatic reminders and confirmations</li>
                <li>✓ Client cancel with automatic refund rules</li>
                <li>✓ One-tap no-show, keep the deposit</li>
                <li>✓ Your own booking page for your Instagram bio</li>
              </ul>
              <p className="text-muted text-sm">
                No fees on deposits paid with Cash App, Zelle or Venmo. Card deposits are{" "}
                {PROCESSING_FEE_LABEL}: on a {formatCents(SAMPLE_DEPOSIT)} deposit you receive{" "}
                {formatCents(techPayoutCents(SAMPLE_DEPOSIT))}.
              </p>
              <ButtonLink href="/login">{START}</ButtonLink>
              <p className="text-muted text-xs">
                No card to sign up. You add one when you send your first pay link.
              </p>
            </div>
            <p className="text-muted text-sm">One saved no-show pays for months of {APP_NAME}.</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-2xl px-5 py-14">
          <h2 className="text-3xl font-bold">Questions</h2>
          <div className="mt-6 flex flex-col">
            <Faq q="Do my clients need to download anything or make an account?">
              No. They tap the link you send, read your policy, and pay with your Cash App, Zelle or
              Venmo, or by card, Apple Pay or Google Pay if you take cards. That&apos;s it.
            </Faq>
            <Faq q="How do I get paid?">
              Your choice. Clients can send the deposit straight to your Cash App, Zelle or Venmo,
              and you tap Received when it lands. Or connect Stripe (about 5 minutes) and card
              deposits go to your bank automatically.
            </Faq>
            <Faq q="What happens when a client cancels?">
              If they cancel before your cancellation window (for example, 48 hours before), their
              deposit is refunded: automatically for card deposits, or we remind you to send it back
              on Cash App, Zelle or Venmo. If it&apos;s later than that, you keep it. Either way,
              you get a notification so you can fill the spot.
            </Faq>
            <Faq q="What if a client doesn't show up?">
              After the appointment time, tap &ldquo;No-show, keep deposit.&rdquo; The client gets
              an email saying the deposit was kept per your policy, which they agreed to before
              paying.
            </Faq>
            <Faq q="Do I need to change how I book?">
              No. Keep booking in your DMs. {APP_NAME} just adds the deposit link, reminders and
              policy on top.
            </Faq>
            <Faq q="What does it cost?">
              {price}/month after a {TRIAL_DAYS}-day free trial. No fees on Cash App, Zelle or Venmo
              deposits; card deposits are {PROCESSING_FEE_LABEL}. No contract. Cancel anytime from
              your billing page.
            </Faq>
            <Faq q="Do I need a card to try it?">
              Not to sign up. You add a card when you&apos;re ready to send your first pay link, and
              you won&apos;t be charged until your {TRIAL_DAYS}-day trial ends.
            </Faq>
          </div>
        </section>

        {/* Final call to action */}
        <section className="bg-brand text-brand-foreground">
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-5 py-14 text-center">
            <h2 className="text-3xl font-bold">Your time is worth protecting.</h2>
            <p className="opacity-90">Set up in 2 minutes. Send your first deposit link today.</p>
            <Link
              href="/login"
              className="bg-surface text-brand inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 font-semibold sm:w-auto"
            >
              {START}
            </Link>
          </div>
        </section>
      </main>

      <footer className="text-muted mx-auto flex w-full max-w-5xl flex-col gap-2 px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-sm sm:flex-row sm:justify-between">
        <span>© {APP_NAME}</span>
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </footer>
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
    <div className="border-foreground mx-auto w-full max-w-[280px] overflow-hidden rounded-[2.25rem] border-[7px] shadow-xl">
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-line bg-background rounded-2xl border p-5">
      <p className="text-brand text-3xl font-bold">{value}</p>
      <p className="text-muted mt-1 text-sm">{label}</p>
    </div>
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
    <li className="flex flex-col gap-5">
      <div className="flex gap-4">
        <span className="bg-brand text-brand-foreground flex size-9 shrink-0 items-center justify-center rounded-full font-semibold">
          {n}
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-muted">{body}</p>
        </div>
      </div>
      <Phone src={image} alt={alt} />
    </li>
  );
}

function Feature({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="border-line bg-background flex flex-col gap-2 rounded-2xl border p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-muted text-sm">{children}</p>
    </li>
  );
}

function Row({ label, them }: { label: string; them: boolean }) {
  return (
    <tr className="border-line border-b last:border-0">
      <td className="p-4">{label}</td>
      <td className="text-muted p-4 text-center" aria-label={them ? "Yes" : "No"}>
        {them ? "✓" : "✗"}
      </td>
      <td className="text-success p-4 text-center font-semibold" aria-label="Yes">
        ✓
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
