import type { Metadata } from "next";
import { LegalLinks } from "@/components/ui/legal-links";
import { ProInvite } from "@/components/ui/pro-invite";
import { publicEnv } from "@/lib/env.public";
import { inviteUrl } from "@/lib/referral";
import { notFound } from "next/navigation";
import { z } from "zod";
import { accentStyle } from "@/lib/accents";
import {
  cancellationTerms,
  loadAppointmentContext,
  loadSettledDeposit,
  payability,
  policySummary,
} from "@/lib/appointments";
import { formatCents } from "@/lib/money";
import { formatWhen } from "@/lib/time";
import { MANUAL_APP_LABEL, manualHandles, paymentAppUrl } from "@/lib/payments";
import { cancelByClient, clientSentDeposit, payDeposit } from "./actions";
import { AddToCalendar } from "./add-to-calendar";
import { CancelForm } from "./cancel-form";
import type { ContactAsk } from "./contact-fields";
import { ManualPayForm } from "./manual-pay-form";
import { PayForm } from "./pay-form";
import { Notice, PayHeader, PayTitle, PolicyCard, Ticket } from "./ui";

export const metadata: Metadata = {
  title: "Pay your deposit",
  robots: { index: false, follow: false },
};

/**
 * Public pay page, sent to the client in an Instagram DM. The unguessable
 * appointment id in the URL is what grants access, so show only what the
 * client needs.
 */
export default async function PayPage({ params, searchParams }: PageProps<"/pay/[id]">) {
  const { id } = await params;
  const { paid } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const ctx = await loadAppointmentContext(id);
  if (!ctx) notFound();

  const { appointment: a, tech, serviceName } = ctx;
  const business = tech.business_name ?? "Your provider";
  const when = formatWhen(a.starts_at, tech.timezone);
  const deposit = a.deposit_cents ?? 0;
  const rest = Math.max((a.price_cents ?? 0) - deposit, 0);
  const state = payability(a);
  const booked = a.status === "confirmed" || a.status === "completed";
  const policy =
    a.policy_text_snapshot ?? policySummary(tech.cancellation_window_hours, tech.policy_text);
  const dm = tech.instagram_handle ? `https://ig.me/m/${tech.instagram_handle}` : null;
  const upcoming = a.status === "confirmed" && new Date(a.starts_at) > new Date();
  const terms = cancellationTerms(a, tech.cancellation_window_hours);
  const settled = a.status === "cancelled_by_client" ? await loadSettledDeposit(a.id) : null;
  const manual = a.payment_method === "manual";
  const waitingOnPro = manual && a.status === "pending_deposit" && a.client_marked_sent_at;
  const note = `Deposit ${serviceName} ${when}`.slice(0, 60);
  // Sent without an email: the client adds theirs before paying (and a phone if that's missing too).
  const askContact: ContactAsk = a.client_email
    ? null
    : a.client_phone
      ? "email"
      : "email_and_phone";
  const messageTech = dm ? (
    <a href={dm} className="text-brand underline">
      message {business}
    </a>
  ) : (
    `message ${business}`
  );

  const title = booked
    ? "You're booked"
    : a.status === "pending_deposit"
      ? waitingOnPro
        ? "Thanks! Almost there"
        : "Secure your spot"
      : a.status === "no_show"
        ? "Missed appointment"
        : a.status === "expired"
          ? "This link has expired"
          : "Appointment cancelled";
  const stamp = booked
    ? ({ label: "Booked", tone: "success" } as const)
    : waitingOnPro
      ? ({ label: "Checking", tone: "brand" } as const)
      : a.status === "pending_deposit"
        ? undefined
        : ({ label: "Closed", tone: "muted" } as const);

  return (
    // The pro's own color: buttons, highlights and their initial follow it.
    <div className="flex flex-1 flex-col" style={accentStyle(tech.accent_color)}>
      <PayHeader business={business} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 pt-7 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <PayTitle
          eyebrow={
            a.status === "pending_deposit" ? `Hi ${a.client_name.split(" ")[0]},` : undefined
          }
          title={title}
        />

        <Ticket
          service={serviceName}
          when={when}
          deposit={formatCents(deposit)}
          rest={rest > 0 ? formatCents(rest) : null}
          stamp={stamp}
        />

        {booked ? (
          <>
            <Notice tone="success">
              Your {formatCents(deposit)} deposit is paid. We emailed your confirmation. See you
              then!
            </Notice>
            {upcoming && <AddToCalendar href={`/pay/${a.id}/calendar`} />}
            {upcoming && (
              <section className="flex flex-col gap-3 pt-2">
                <h2 className="font-display text-lg font-extrabold tracking-tight">
                  Can&apos;t make it?
                </h2>
                <p className="text-muted text-sm">
                  To reschedule, {messageTech}.{" "}
                  {terms.refundable
                    ? `If you need to cancel, do it by ${formatWhen(terms.refundDeadline, tech.timezone)} to get your ${formatCents(deposit)} deposit back.`
                    : `It's less than ${terms.windowHours} hours before your appointment, so if you cancel now your ${formatCents(deposit)} deposit is kept, per the policy.`}
                </p>
                <CancelForm
                  action={cancelByClient.bind(null, a.id)}
                  expectRefund={terms.refundable}
                  confirmText={
                    terms.refundable
                      ? `Cancel your appointment? Your ${formatCents(deposit)} deposit will be refunded.`
                      : `Cancel your appointment? Your ${formatCents(deposit)} deposit will NOT be refunded.`
                  }
                />
              </section>
            )}
          </>
        ) : a.status === "cancelled_by_client" ? (
          <Notice>
            You cancelled this appointment.{" "}
            {settled?.status === "refund_due" ||
            (settled?.status === "refunded" && settled.method === "manual")
              ? `${business} will send your ${formatCents(settled.amount_cents)} deposit back the same way you paid it.`
              : settled?.status === "refunded"
                ? `Your ${formatCents(settled.amount_cents)} deposit is being refunded; it can take 5 to 10 business days.`
                : `Your ${formatCents(settled?.amount_cents ?? deposit)} deposit was kept, per the policy.`}
          </Notice>
        ) : waitingOnPro ? (
          <Notice tone="success">
            {business} will check for your {formatCents(deposit)} deposit and confirm your spot.
            You&apos;ll get an email when you&apos;re booked.
          </Notice>
        ) : paid && a.status === "pending_deposit" ? (
          <Notice tone="success">
            Payment received. Your booking is being confirmed, and you&apos;ll get an email shortly.
          </Notice>
        ) : state === "ok" ? (
          <>
            <PolicyCard
              refundBy={terms.refundable ? formatWhen(terms.refundDeadline, tech.timezone) : null}
              policy={policy}
            />
            {manual ? (
              <ManualPayForm
                action={clientSentDeposit.bind(null, a.id)}
                amount={formatCents(deposit)}
                askContact={askContact}
                options={manualHandles(tech).map((h) => ({
                  ...h,
                  label: MANUAL_APP_LABEL[h.app],
                  url: paymentAppUrl(h, deposit, note),
                }))}
              />
            ) : (
              <PayForm
                action={payDeposit.bind(null, a.id)}
                amount={formatCents(deposit)}
                askContact={askContact}
              />
            )}
          </>
        ) : a.status === "cancelled_by_tech" ? (
          <Notice>This appointment was cancelled.</Notice>
        ) : a.status === "no_show" ? (
          <Notice>This appointment is closed.</Notice>
        ) : (
          <Notice>
            This pay link has expired.{" "}
            {dm ? (
              <a href={dm} className="text-brand underline">
                Message {business}
              </a>
            ) : (
              `Message ${business}`
            )}{" "}
            for a new one.
          </Notice>
        )}
        {/* Only once they've paid (or say they have): never a distraction before. */}
        {(booked || waitingOnPro) && (
          <ProInvite href={inviteUrl(publicEnv().NEXT_PUBLIC_APP_URL, tech.slug, "paylink")} />
        )}
        <LegalLinks className="mt-auto pt-4" />
      </main>
    </div>
  );
}
