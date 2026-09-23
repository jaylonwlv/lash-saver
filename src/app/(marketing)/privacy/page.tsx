import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, LEGAL_CONTACT_EMAIL } from "@/lib/config";
import { LegalPage, Section } from "../legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

const email = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <Section title="Who this covers">
        <p>
          This policy explains what personal information {APP_NAME} collects, how we use it and the
          choices you have. It covers pros, who have an account, and clients, who open a pay link or
          booking page and never need an account. It&apos;s part of our{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </Section>

      <Section title="Information about pros">
        <ul>
          <li>
            <strong>Account and business details:</strong> your email address, business name,
            booking page link, Instagram handle, time zone, services, prices, deposits and
            cancellation policy.
          </li>
          <li>
            <strong>Payment details you choose to share:</strong> your Cash App, Zelle or Venmo
            handle, which we show to your clients on pay links.
          </li>
          <li>
            <strong>Stripe:</strong> if you take card deposits, Stripe collects your identity and
            bank details directly. We receive your Stripe account ID and whether it&apos;s ready to
            receive money, not your full bank or ID details.
          </li>
          <li>
            <strong>Subscription:</strong> your card is entered with Stripe, not with us. We store
            your subscription status and dates.
          </li>
          <li>
            <strong>Trial checks:</strong> to keep the free trial to one per person, we keep
            fingerprints Stripe gives us for your card and payout bank account (codes that identify
            an account without revealing its number), plus a normalized copy of your email address
            and your handles.
          </li>
        </ul>
      </Section>

      <Section title="Information about clients">
        <ul>
          <li>
            <strong>Details your pro enters:</strong> your name, and the email, phone number,
            Instagram handle and notes they add for your appointment.
          </li>
          <li>
            <strong>Your appointment:</strong> the service, date and time, price and deposit, and
            its status (booked, cancelled, completed, no-show).
          </li>
          <li>
            <strong>Your agreement:</strong> the deposit policy you agreed to and the time you
            agreed.
          </li>
          <li>
            <strong>Your deposit:</strong> whether it was paid, refunded or kept. For card payments,
            Stripe collects your card details directly; we never see your full card number. For Cash
            App, Zelle or Venmo, we record which app you said you used, not your account on that
            app.
          </li>
        </ul>
      </Section>

      <Section title="Information collected automatically">
        <p>
          Pros stay signed in with cookies that are needed for the account to work. Our hosting and
          service providers keep standard logs (such as IP address, browser type and the pages
          requested) for security and troubleshooting. We don&apos;t use advertising cookies or
          trackers on pay links or booking pages.
        </p>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To run {APP_NAME}: pay links, booking pages, deposits, cancellations and refunds.</li>
          <li>
            To send messages about appointments (confirmations, reminders, cancellations) and about
            pros&apos; accounts (sign-in codes, billing and trial notices).
          </li>
          <li>To prevent fraud, repeat free trials and misuse, and to keep the service secure.</li>
          <li>
            To help with payment disputes, for example by showing the policy a client agreed to.
          </li>
          <li>To answer questions, fix problems and improve {APP_NAME}.</li>
          <li>To meet legal, tax and accounting obligations.</li>
        </ul>
      </Section>

      <Section title="Who we share it with">
        <ul>
          <li>
            <strong>Between pros and their clients:</strong> a client&apos;s booking details are
            shared with the pro they&apos;re booking with, and a pro&apos;s business details, policy
            and payment handles are shown to their clients.
          </li>
          <li>
            <strong>Service providers</strong> who run parts of {APP_NAME} for us, under their own
            privacy and security commitments: Supabase (database and sign-in), Vercel (hosting),
            Stripe (payments and billing) and Resend (email).
          </li>
          <li>
            <strong>When required:</strong> to comply with the law or a valid legal request, or to
            protect the rights and safety of our users, the public or {APP_NAME}.
          </li>
          <li>
            <strong>Business changes:</strong> if {APP_NAME} is sold or merged, information may
            transfer to the new owner under this policy.
          </li>
        </ul>
        <p>
          We don&apos;t sell personal information, and we don&apos;t share it for targeted
          advertising.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep pros&apos; account information while the account is open. Appointment, deposit and
          policy records are kept as long as needed for payment disputes, refunds, records and legal
          obligations, and then deleted. Sign-in codes and logs are kept only briefly.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <ul>
          <li>Pros can see and edit most of their information in the app at any time.</li>
          <li>
            Anyone can ask us for a copy of their information, or to correct or delete it, by
            emailing {email}. Clients can also ask the pro they booked with. We may keep what we
            must for legal reasons or open disputes, and we&apos;ll tell you if so.
          </li>
          <li>
            Depending on where you live (for example California), you may have additional rights
            under state law, such as knowing what we collect and asking us to delete it. We honor
            these requests for everyone, and we won&apos;t treat you differently for making one.
          </li>
          <li>
            Appointment emails are part of a booking you made, so they can&apos;t be turned off
            separately. If you don&apos;t want them, contact the pro or cancel the appointment.
          </li>
        </ul>
      </Section>

      <Section title="Security">
        <p>
          We use encrypted connections, access controls that keep each pro&apos;s data separate, and
          payment providers that handle card and bank details so we don&apos;t store them. No system
          is perfectly secure, so please keep your sign-in email safe and tell us if you notice
          anything wrong.
        </p>
      </Section>

      <Section title="Children">
        <p>
          {APP_NAME} is not meant for anyone under 18, and we don&apos;t knowingly collect
          information from children under 13. If you believe a child has given us information, email
          us and we&apos;ll delete it.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We&apos;ll update this policy as {APP_NAME} changes and change the date at the top. For
          significant changes, we&apos;ll email pros before they take effect.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions or requests about your privacy? Email {email}.</p>
      </Section>
    </LegalPage>
  );
}
