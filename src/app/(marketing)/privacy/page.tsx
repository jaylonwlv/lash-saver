import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, ASSISTANT_NAME, LEGAL_CONTACT_EMAIL } from "@/lib/config";
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
          menu page and never need an account. It&apos;s part of our{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </Section>

      <Section title="Information about pros">
        <ul>
          <li>
            <strong>Account and business details:</strong> your email address, business name, menu
            page link, Instagram handle, time zone, services, prices, deposits and cancellation
            policy.
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
          <li>
            <strong>Your own website (optional):</strong> if you buy a web address through{" "}
            {APP_NAME}, the owner details the domain registry requires (your name, address, phone
            and email). We pass them to our registrar to register the domain in your name and delete
            our copy once it&apos;s registered; the registrar keeps them as registry rules require.
          </li>
          <li>
            <strong>How you found us:</strong> if you signed up from the &ldquo;Powered by{" "}
            {APP_NAME}&rdquo; link on another pro&apos;s pay link, menu page or confirmation email,
            which pro&apos;s page it was. It&apos;s kept for 7 days on your phone before you sign
            up, and is never shown to clients.
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
          <li>
            <strong>Catering events:</strong> if you book a caterer through their {APP_NAME} quote
            page, we collect your name, email, phone number (optional), the event date, time,
            address, guest count, menu choices and notes you enter, the agreement you sign (with the
            name you typed, the time, your IP address and browser, kept as the record of your
            signature), and the payments and refunds made. The caterer sees all of it; we use it
            only to run your booking, send your confirmation and balance reminders, and keep
            records.
          </li>
        </ul>
      </Section>

      <Section title="Information collected automatically">
        <p>
          Pros stay signed in with cookies that are needed for the account to work. Our hosting and
          service providers keep standard logs (such as IP address, browser type and the pages
          requested) for security and troubleshooting.
        </p>
        <p>
          To measure our own ads, our marketing pages and sign-in page use the Meta Pixel, which
          sets a cookie and tells Meta (Facebook and Instagram) which pages were visited and whether
          someone started signing up (without their email address). When a pro signs up, starts a
          trial or subscribes, we also tell Meta, using a scrambled (hashed) email address, so we
          can see which ads work. To see how people use those pages (where they tap and how far they
          scroll), the same marketing pages also use Microsoft Clarity, which records clicks, taps,
          scrolling and mouse movement. Clarity hides what people type, such as email addresses, and
          Microsoft processes this data under its own privacy statement. We don&apos;t use
          advertising cookies, Clarity or other trackers on pay links, menu pages or the pro
          dashboard, and we never share clients&apos; information with advertisers.
        </p>
      </Section>

      <Section title="Help chat">
        <p>
          Our marketing pages and the pro app have a help chat, {ASSISTANT_NAME}, that answers
          questions about {APP_NAME}. What you type there is sent to Anthropic, the company whose AI
          writes the answers, which processes it under its own commercial terms. We keep the
          questions asked, and whether an answer was marked helpful, in our logs without a name,
          email address or IP address, so we can improve the answers. The chat isn&apos;t given your
          account or booking details. Please don&apos;t type card numbers, passwords or other
          sensitive information into it. Clients don&apos;t see the chat on pay links or menu pages.
        </p>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To run {APP_NAME}: pay links, menu pages, deposits, cancellations and refunds.</li>
          <li>
            To send messages about appointments (confirmations, reminders, cancellations) and about
            pros&apos; accounts (sign-in codes, a welcome note and up to three setup reminders after
            sign-up, billing and trial notices).
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
            and payment handles are shown to their clients. Photos a pro adds to their page are
            public: anyone with the link to their page can see them. We shrink photos and remove
            their location data before they&apos;re stored.
          </li>
          <li>
            <strong>Calendars you choose to use:</strong> a client who adds their appointment to
            their calendar, or a pro who subscribes their calendar (such as Apple Calendar or Google
            Calendar) to their appointments, sends those appointment details to that calendar
            provider. A pro&apos;s calendar link is private and can be reset in the app at any time.
          </li>
          <li>
            <strong>Service providers</strong> who run parts of {APP_NAME} for us, under their own
            privacy and security commitments: Supabase (database and sign-in), Vercel (hosting),
            Stripe (payments and billing), Vercel and its registrar partner name.com (registering
            web addresses pros buy), Resend (email), Anthropic (answers in the help chat, described
            above), Cloudflare (a check on the sign-up page that you&apos;re a person, not a bot),
            Meta (ad measurement for our own marketing, described above) and Microsoft Clarity (how
            people use our marketing pages, described above).
          </li>
          <li>
            <strong>Apple and Google sign-in:</strong> if a pro chooses &ldquo;Continue with
            Apple&rdquo; or &ldquo;Continue with Google&rdquo;, that company confirms who they are
            and shares their name and email address with us (with Apple, possibly a private relay
            address that forwards to them). We use it only to sign them in. Clients never sign in.
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
          We don&apos;t sell personal information. The only information we share for advertising is
          the pro sign-up and trial measurement described above, and you can opt out of it by
          emailing {email}.
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
          <li>
            Pros get emails about their account, billing and their clients&apos; bookings, plus
            occasional tips and reminders about getting the most from {APP_NAME} (for example after
            sending a first pay link). Every tips email has a link to stop them, and unsubscribing
            never affects account or booking emails.
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
