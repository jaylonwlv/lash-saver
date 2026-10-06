"use client";

import { useState, type ReactNode } from "react";
import { CancelForm } from "@/app/pay/[id]/cancel-form";
import { ManualPayForm, type PayOption } from "@/app/pay/[id]/manual-pay-form";
import { PayForm } from "@/app/pay/[id]/pay-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { LegalLinks } from "@/components/ui/legal-links";
import { APP_NAME, TRIAL_DAYS } from "@/lib/config";
import type { FormState } from "@/lib/forms";
import { formatCents, techPayoutCents } from "@/lib/money";

/*
 * A pay link anyone can try without signing up. It reuses the real pay page's
 * forms with local actions: nothing is charged, sent or saved. Days are named
 * without dates so the static page never goes stale.
 */

const BUSINESS = "Studio Nova";
const CLIENT = "Jordan";
const SERVICE = "Signature session";
const WHEN = "Saturday at 2:00 PM";
const REFUND_BY = "Thursday at 2:00 PM";
const PRICE = 16000;
const DEPOSIT = 4000;
// Open buttons are left out on purpose: a demo shouldn't open a real payment app.
const OPTIONS: PayOption[] = [
  { app: "cashapp", label: "Cash App", handle: "$StudioNovaDemo", url: null },
  { app: "zelle", label: "Zelle", handle: "hello@studionova.example", url: null },
  { app: "venmo", label: "Venmo", handle: "@StudioNova-Demo", url: null },
];
const SIGN_UP = "/start";

type Method = "card" | "manual";
type Stage = "pay" | "sent" | "booked" | "cancelled";

const amount = formatCents(DEPOSIT);

function agreed(formData: FormData): FormState | null {
  return formData.get("agree") === "on"
    ? null
    : { errors: { agree: "Please agree to the deposit policy to continue." } };
}

export function DemoPayPage({ policy }: { policy: string }) {
  const [method, setMethod] = useState<Method>("card");
  const [stage, setStage] = useState<Stage>("pay");

  function go(next: Stage) {
    setStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pay(_prev: FormState, formData: FormData): Promise<FormState> {
    const error = agreed(formData);
    if (error) return error;
    go(method === "card" ? "booked" : "sent");
    return {};
  }

  async function cancel(): Promise<FormState> {
    go("cancelled");
    return {};
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-ink px-5 py-4 text-white">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <p className="text-sm">
            <strong className="text-pink">Demo:</strong> this is the page your client opens from
            your DM. Try it. Nothing is charged.
          </p>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wide uppercase opacity-90">
              Your client pays by
            </span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Payment method">
              {(
                [
                  ["card", "Card"],
                  ["manual", "Cash App, Zelle, Venmo"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={method === value}
                  onClick={() => {
                    setMethod(value);
                    setStage("pay");
                  }}
                  className={`min-h-12 rounded-xl px-3 text-sm font-semibold ${
                    method === value ? "bg-pink text-ink" : "border border-white/30 bg-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-1">
          <p className="text-brand text-sm font-semibold">{BUSINESS}</p>
          <h1 className="text-2xl font-bold">
            {stage === "booked"
              ? "You're booked"
              : stage === "cancelled"
                ? "Appointment cancelled"
                : `Hi ${CLIENT}, ${stage === "sent" ? "thanks!" : "secure your spot"}`}
          </h1>
        </div>

        <dl className="border-line bg-surface flex flex-col gap-4 rounded-2xl border p-5">
          <Row label="Appointment">{SERVICE}</Row>
          <Row label="When">{WHEN}</Row>
          <Row label="Deposit">
            {amount}
            <span className="text-muted">
              {" "}
              · {formatCents(PRICE - DEPOSIT)} due at your appointment
            </span>
          </Row>
        </dl>

        {stage === "pay" && (
          <>
            <section className="flex flex-col gap-2">
              <h2 className="font-semibold">Deposit policy</h2>
              <p className="text-muted text-sm whitespace-pre-line">{policy}</p>
            </section>
            {method === "card" ? (
              <PayForm key="card" action={pay} amount={amount} />
            ) : (
              <ManualPayForm key="manual" action={pay} amount={amount} options={OPTIONS} />
            )}
          </>
        )}

        {stage === "sent" && (
          <>
            <Notice tone="success">
              Thanks! {BUSINESS} will check for your {amount} deposit and confirm your spot.
              You&apos;ll get an email when you&apos;re booked.
            </Notice>
            <ProView title="Meanwhile, on your phone">
              <p>
                You get an email: &ldquo;{CLIENT} says they sent their {amount} deposit.&rdquo;
                Check your app, then tap Received.
              </p>
              <Button type="button" onClick={() => go("booked")}>
                Received
              </Button>
            </ProView>
          </>
        )}

        {stage === "booked" && (
          <>
            <Notice tone="success">
              Your {amount} deposit is paid. We emailed your confirmation. See you then!
            </Notice>
            <section className="flex flex-col gap-3">
              <h2 className="font-semibold">Can&apos;t make it?</h2>
              <p className="text-muted text-sm">
                To reschedule, message {BUSINESS}. If you need to cancel, do it by {REFUND_BY} to
                get your {amount} deposit back.
              </p>
              <CancelForm
                action={cancel}
                expectRefund
                confirmText={`Cancel your appointment? Your ${amount} deposit will be refunded.`}
              />
            </section>
            <ProView title="What you get">
              <ul className="flex list-disc flex-col gap-2 pl-5">
                {method === "card" ? (
                  <li>
                    {CLIENT} paid on Stripe&apos;s secure checkout (card, Apple Pay or Google Pay).{" "}
                    {formatCents(techPayoutCents(DEPOSIT))} goes to your bank.
                  </li>
                ) : (
                  <li>The {amount} is already in your Cash App, Zelle or Venmo. No fees.</li>
                )}
                <li>
                  Proof {CLIENT} agreed to your policy before paying, saved with the date and time.
                </li>
                <li>Reminders go out 48 and 24 hours before, with the last day to cancel.</li>
                <li>No-show? One tap and you keep the deposit.</li>
              </ul>
            </ProView>
          </>
        )}

        {stage === "cancelled" && (
          <>
            <Notice>
              You cancelled this appointment.{" "}
              {method === "card"
                ? `Your ${amount} deposit is being refunded; it can take 5 to 10 business days.`
                : `${BUSINESS} will send your ${amount} deposit back the same way you paid it.`}
            </Notice>
            <ProView title="What you get">
              <p>
                An email right away, so you can fill the spot. {CLIENT} cancelled before your
                deadline, so they get their deposit back. After the deadline, you&apos;d keep it.
              </p>
              <Button type="button" variant="secondary" onClick={() => go("pay")}>
                Try it again
              </Button>
            </ProView>
          </>
        )}

        <section className="border-line flex flex-col gap-3 border-t pt-6">
          <h2 className="text-lg font-bold">Send links like this to your clients</h2>
          <p className="text-muted text-sm">
            Set up {APP_NAME} in about 2 minutes. Your policy, your prices, your Cash App, Zelle,
            Venmo or card.
          </p>
          <ButtonLink href={SIGN_UP}>Start free for {TRIAL_DAYS} days</ButtonLink>
          <p className="text-muted text-center text-xs">
            No card to sign up. You add one before your first pay link and aren&apos;t charged until
            the trial ends.
          </p>
        </section>

        <LegalLinks className="mt-auto pt-2" />
      </main>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function Notice({ tone, children }: { tone?: "success"; children: ReactNode }) {
  return (
    <p
      className={`rounded-2xl border p-5 ${
        tone === "success" ? "border-success text-success bg-surface" : "border-line bg-surface"
      }`}
    >
      {children}
    </p>
  );
}

/** The pro's side of the same moment, clearly marked as not part of the client's page. */
function ProView({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-brand flex flex-col gap-3 rounded-2xl border-2 border-dashed p-5 text-sm">
      <p className="text-brand text-xs font-semibold tracking-wide uppercase">
        Your side · {title}
      </p>
      {children}
    </section>
  );
}
