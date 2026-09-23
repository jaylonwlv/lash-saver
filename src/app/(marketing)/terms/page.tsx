import type { Metadata } from "next";
import Link from "next/link";
import {
  APP_NAME,
  GOVERNING_STATE,
  LEGAL_CONTACT_EMAIL,
  PROCESSING_FEE_LABEL,
  SUBSCRIPTION_PRICE_CENTS,
  TRIAL_DAYS,
} from "@/lib/config";
import { formatCents } from "@/lib/money";
import { LegalPage, Section } from "../legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

const price = formatCents(SUBSCRIPTION_PRICE_CENTS);
const email = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <Section title="1. The short version">
        <p>
          {APP_NAME} is software that helps independent service providers (&ldquo;pros&rdquo;) take
          deposits, share their cancellation policy, remind clients about appointments and keep
          track of no-shows. The pro runs their business and sets their own prices and policies.{" "}
          {APP_NAME} provides the tools; we are not a party to the agreement between a pro and their
          client.
        </p>
        <p>
          These terms apply to everyone who uses {APP_NAME}: pros who create an account, and clients
          who open a pay link or booking page. By using {APP_NAME}, you agree to them. If you
          don&apos;t agree, please don&apos;t use it. Our{" "}
          <Link href="/privacy">Privacy Policy</Link> explains how we handle personal information.
        </p>
      </Section>

      <Section title="2. Who can use it">
        <p>
          You must be at least 18 years old and able to enter a binding contract. Pros must give
          accurate information and keep their sign-in email secure; you are responsible for what
          happens in your account. Tell us right away at {email} if you think someone else has
          accessed it.
        </p>
      </Section>

      <Section title="3. Pros: your business, your policy">
        <ul>
          <li>
            You decide your services, prices, deposit amounts and cancellation policy, and you are
            responsible for them, for the services you provide, and for following the laws that
            apply to your business (including licensing, taxes and consumer protection rules).
          </li>
          <li>
            Your policy must be clear and honest. {APP_NAME} shows it to clients before they pay and
            saves the version they agreed to, with the time they agreed.
          </li>
          <li>
            Only create appointments and pay links for real bookings a client asked for, and only
            enter client contact details you have permission to use. {APP_NAME} sends
            appointment-related messages (confirmations, reminders, cancellation notices) to those
            details on your behalf.
          </li>
          <li>
            When you mark an appointment completed or a no-show, or confirm that you received or
            refunded a deposit, you&apos;re responsible for that being accurate.
          </li>
        </ul>
      </Section>

      <Section title="4. Subscription and free trial">
        <ul>
          <li>
            Creating pay links requires a subscription: {price} per month after a {TRIAL_DAYS}-day
            free trial. You add a card to start the trial and won&apos;t be charged until it ends.
          </li>
          <li>
            The subscription renews automatically every month and your card is charged each period
            until you cancel. You can cancel anytime from the Billing page; cancellation takes
            effect at the end of the current period (or the end of the trial, in which case you
            aren&apos;t charged). We don&apos;t refund partial months.
          </li>
          <li>
            The free trial is one per person or business. We check signals such as payment cards,
            payout accounts, email addresses and handles, and we may end a trial early or decline
            one if it appears to be a repeat.
          </li>
          <li>
            If a payment fails, you can keep using existing pay links for a short grace period, but
            you may not be able to create new ones until the payment goes through.
          </li>
          <li>
            We may change the price with at least 30 days&apos; notice by email. The new price
            applies from your next billing period after the notice, and you can cancel before it
            takes effect.
          </li>
        </ul>
      </Section>

      <Section title="5. Deposits paid by card (Stripe)">
        <ul>
          <li>
            Card payments are processed by Stripe. To receive card deposits, a pro connects a Stripe
            account and agrees to the{" "}
            <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noreferrer">
              Stripe Connected Account Agreement
            </a>
            , which includes the{" "}
            <a href="https://stripe.com/legal/ssa" target="_blank" rel="noreferrer">
              Stripe Services Agreement
            </a>
            . Stripe verifies the pro&apos;s identity and sends deposits to their bank.
          </li>
          <li>
            {APP_NAME} charges a processing fee of {PROCESSING_FEE_LABEL} on each card deposit,
            deducted before the deposit reaches the pro. When a deposit is refunded because the pro
            or client cancelled, the client gets the full deposit back and the processing fee is not
            returned to the pro, because the card network&apos;s fees aren&apos;t returned either.
          </li>
          <li>
            Refunds follow the policy the client agreed to: a cancellation before the refund
            deadline shown on the pay link is refunded automatically, and a pro&apos;s cancellation
            is refunded in full. Refunds usually take 5 to 10 business days to reach the client.
          </li>
          <li>
            If a client disputes a card payment (a chargeback), the pro is responsible for it. We
            share the saved policy agreement to help, and we may recover disputed amounts and
            related fees from the pro, including by reversing the transfer or charging the card on
            file.
          </li>
        </ul>
      </Section>

      <Section title="6. Deposits paid directly (Cash App, Zelle, Venmo)">
        <ul>
          <li>
            A pro can instead ask clients to send deposits to the pro&apos;s own Cash App, Zelle or
            Venmo. That money goes straight from the client to the pro. {APP_NAME} never receives,
            holds or transfers it, and doesn&apos;t charge a fee on it.
          </li>
          <li>
            {APP_NAME} can&apos;t see or verify these payments. The pro confirms when a deposit
            arrives, and the pro is responsible for sending any refund owed under their policy.{" "}
            {APP_NAME} reminds the pro and records when they say it&apos;s sent.
          </li>
          <li>
            These apps are run by other companies under their own terms. {APP_NAME} isn&apos;t
            responsible for payments sent to the wrong person, delays, limits or fees on those apps.
          </li>
        </ul>
      </Section>

      <Section title="7. Clients">
        <ul>
          <li>
            When you tick &ldquo;I agree&rdquo; on a pay link, you&apos;re agreeing to the
            pro&apos;s deposit and cancellation policy shown on that page. That agreement is between
            you and the pro.
          </li>
          <li>
            You can cancel from your pay link. Whether your deposit is refunded depends on the
            policy and the deadline shown there; the page tells you before you confirm. To
            reschedule, or for questions about the service itself, contact the pro.
          </li>
          <li>
            If you paid by card and something went wrong with the payment itself, contact us at{" "}
            {email}.
          </li>
        </ul>
      </Section>

      <Section title="8. Things you can't do">
        <ul>
          <li>Use {APP_NAME} for anything illegal, or for services Stripe prohibits.</li>
          <li>
            Create fake appointments, take deposits you don&apos;t intend to honor, or mislead
            clients.
          </li>
          <li>Send spam or harass anyone through {APP_NAME}.</li>
          <li>
            Try to get around the subscription or trial limits, access other people&apos;s data, or
            interfere with, copy, scrape or reverse engineer the service.
          </li>
        </ul>
        <p>We may suspend or close accounts that break these rules.</p>
      </Section>

      <Section title="9. Your content">
        <p>
          You keep ownership of what you put into {APP_NAME} (your business name, services, policy
          and so on). You give us permission to store, display and send it as needed to run the
          service, for example showing your services on your booking page and your policy on pay
          links.
        </p>
      </Section>

      <Section title="10. Ending your account">
        <p>
          You can stop using {APP_NAME} anytime: cancel your subscription from the Billing page, and
          email {email} if you also want your account deleted. We may suspend or end access if you
          break these terms, don&apos;t pay, or if we&apos;re required to by law. Existing pay links
          may stop working when an account is closed; pros remain responsible for refunds owed under
          their policy.
        </p>
      </Section>

      <Section title="11. Disclaimers">
        <p>
          {APP_NAME} is provided &ldquo;as is.&rdquo; We work hard to keep it running and to deliver
          messages on time, but we don&apos;t guarantee it will be uninterrupted or error-free, that
          every email or reminder will arrive, or that it will prevent every no-show. We don&apos;t
          provide the pros&apos; services and aren&apos;t responsible for their quality.
        </p>
      </Section>

      <Section title="12. Limitation of liability">
        <p>
          To the fullest extent the law allows, {APP_NAME} is not liable for indirect, incidental,
          special or consequential damages, or for lost profits or revenue. Our total liability for
          any claim relating to {APP_NAME} is limited to the greater of the amount you paid us in
          the 12 months before the claim or $100. Some places don&apos;t allow these limits, so they
          may not all apply to you.
        </p>
      </Section>

      <Section title="13. Indemnity">
        <p>
          If you&apos;re a pro, you agree to cover {APP_NAME}&apos;s losses and reasonable costs
          (including legal fees) from claims by your clients or others that arise from your
          services, your policies, your content, or your breaking these terms.
        </p>
      </Section>

      <Section title="14. Governing law">
        <p>
          These terms are governed by the laws of the State of {GOVERNING_STATE}, without regard to
          its conflict of law rules. Any dispute will be handled in the state or federal courts
          located in {GOVERNING_STATE}, unless the law where you live gives you the right to bring
          it elsewhere. Before filing a claim, please email us so we can try to resolve it.
        </p>
      </Section>

      <Section title="15. Changes">
        <p>
          We may update these terms as {APP_NAME} changes. We&apos;ll change the date at the top,
          and for significant changes we&apos;ll email pros before they take effect. Continuing to
          use {APP_NAME} after that means you accept the updated terms.
        </p>
      </Section>

      <Section title="16. Contact">
        <p>Questions about these terms? Email {email}.</p>
      </Section>
    </LegalPage>
  );
}
