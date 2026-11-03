import { APP_NAME, FOUNDER_EMAIL, FOUNDER_NAME } from "@/lib/config";
import type { RenderedMessage } from "./types";

/**
 * Every message the app sends, keyed by template id, with the data it needs.
 * Keep `text` short: it doubles as the SMS body once texting is enabled.
 */
export type TemplateData = {
  deposit_request: {
    businessName: string;
    serviceName: string;
    when: string;
    amount: string;
    payUrl: string;
  };
  booking_confirmed: {
    businessName: string;
    serviceName: string;
    when: string;
    amount: string;
    cancelNote: string;
    detailsUrl: string;
    /** The booking as an .ics file, attached so a tap adds it to their calendar. */
    calendar?: string;
    /** "Powered by Dibs" link for clients who are pros too (lib/referral.ts). */
    proInviteUrl?: string;
  };
  /** To the tech, when a client pays. */
  tech_deposit_paid: {
    clientName: string;
    serviceName: string;
    when: string;
    amount: string;
    appointmentUrl: string;
    /** First pay link sent without a card: what the next one needs (billing.nextLinkCardLine). */
    cardNote?: string | null;
  };
  appointment_reminder: {
    businessName: string;
    serviceName: string;
    when: string;
    cancelNote: string;
    manageUrl: string;
  };
  /** To the client, after they cancel. */
  cancellation_confirmed: {
    businessName: string;
    serviceName: string;
    when: string;
    amount: string;
    refunded: boolean;
    /** The pro sends the refund themselves (Cash App, Zelle, Venmo). */
    refundFromProvider: boolean;
    windowHours: number;
  };
  /** To the pro: the client says they sent a Cash App / Zelle / Venmo deposit. */
  manual_deposit_sent: {
    clientName: string;
    amount: string;
    app: string;
    when: string;
    appointmentUrl: string;
    cardNote?: string | null;
  };
  /**
   * To a pro about a day after their first pay link, if they haven't added a card: the
   * next one needs it. freeUntil ("Dec 2", when the free month ends) is null when they
   * can't get a free trial.
   */
  first_link_followup: { freeUntil: string | null; price: string; billingUrl: string };
  /** To the client: the pro didn't find their deposit. */
  manual_deposit_not_received: {
    businessName: string;
    amount: string;
    payUrl: string;
  };
  /** To the pro: they owe a client a refund they send themselves. */
  manual_refund_due: {
    clientName: string;
    amount: string;
    reason: string;
    appointmentUrl: string;
  };
  /** To the tech, when a client cancels. */
  client_cancelled: {
    clientName: string;
    serviceName: string;
    when: string;
    amount: string;
    refunded: boolean;
    appointmentUrl: string;
  };
  /**
   * To a tech who signed up but hasn't sent a pay link or added a card yet, about a
   * day and three days after sign-up. `nextStep` names what's left; `freeUntil` (when their
   * free month ends) is null when they can't get a free trial.
   */
  setup_nudge_first: { nextStep: string; freeUntil: string | null; dashboardUrl: string };
  setup_nudge_next_booking: { nextStep: string; freeUntil: string | null; dashboardUrl: string };
  /**
   * Plain notes from the founder to a new pro: right after sign-up, and a week later
   * if they haven't sent a pay link. They answer the usual questions themselves and
   * don't ask for a reply (replies still reach the founder).
   */
  /** needsHandle: they skipped their Cash App, Zelle or Venmo at sign-up. */
  /**
   * needsHandle: they skipped their Cash App, Zelle or Venmo at sign-up.
   * signInUrl: a one-tap sign-in link (most sign up in Instagram's browser, which
   * forgets them; tapping this in Mail opens their own browser signed in).
   */
  founder_welcome: {
    appUrl: string;
    /** Their own menu page (getdibs.pro/<slug>), for their Instagram bio. */
    pageUrl?: string;
    needsHandle?: boolean;
    signInUrl?: string;
    /** What the second pay link needs, so the trial card isn't a surprise: trial days, or null (no trial: price). */
    nextLink?: { freeUntil: string | null; price: string };
  };
  founder_checkin: {
    appUrl: string;
    announcement: string;
    freeUntil: string | null;
    price: string;
  };
  /** To the tech, a few days before the first subscription charge. */
  /** `savings`: what Dibs did during the trial, e.g. "Dibs has saved you $120 so far (…)." */
  trial_ending: { endsOn: string; amount: string; billingUrl: string; savings: string | null };
  /** To the tech, when a subscription renewal fails. */
  subscription_payment_failed: { amount: string; billingUrl: string };
  no_show_recorded: { businessName: string; when: string; amount: string };
  deposit_refunded: { businessName: string; amount: string; fromProvider: boolean };
  /** To the tech, when a client disputes a card deposit with their bank. */
  deposit_disputed: { clientName: string; amount: string; when: string; appointmentUrl: string };
  /** To the tech, when the bank decides. */
  deposit_dispute_closed: {
    clientName: string;
    amount: string;
    won: boolean;
    appointmentUrl: string;
  };
  /** To the owner of Dibs, for any dispute on the platform account. */
  dispute_alert: { summary: string; amount: string; dueBy: string; disputeUrl: string };
  // Catering (lib/catering). Messages to hosts come from the business by name, and
  // replies go to the owner.
  catering_booked_host: {
    businessName: string;
    ownerEmail: string;
    when: string;
    guests: number;
    packageName: string;
    total: string;
    paid: string;
    /** "$1,008 due June 7", or null when paid in full. */
    balanceLine: string | null;
    statusUrl: string;
    calendar?: string;
    /** The signed agreement, attached as a text file. */
    agreement?: string;
  };
  catering_booked_owner: {
    hostName: string;
    when: string;
    guests: number;
    packageName: string;
    total: string;
    paid: string;
    bookingUrl: string;
    cardNote?: string | null;
    agreement?: string;
  };
  catering_balance_reminder: {
    businessName: string;
    ownerEmail: string;
    when: string;
    balance: string;
    dueDate: string;
    payUrl: string;
  };
  catering_balance_overdue: {
    hostName: string;
    when: string;
    balance: string;
    dueDate: string;
    bookingUrl: string;
  };
  catering_balance_paid_host: {
    businessName: string;
    ownerEmail: string;
    when: string;
    amount: string;
    statusUrl: string;
  };
  catering_balance_paid_owner: {
    hostName: string;
    when: string;
    amount: string;
    bookingUrl: string;
  };
  catering_day_before: {
    when: string;
    hostName: string;
    hostPhone: string | null;
    address: string;
    guests: number;
    packageName: string;
    addOns: string | null;
    notes: string | null;
    bookingUrl: string;
  };
  catering_cancelled_host: {
    businessName: string;
    ownerEmail: string;
    when: string;
    reason: string | null;
    /** What was refunded automatically, if anything. */
    refunded: string | null;
  };
  catering_host_cancelled_host: {
    businessName: string;
    ownerEmail: string;
    when: string;
    refund: string | null;
    kept: string | null;
  };
  catering_host_cancelled_owner: {
    hostName: string;
    when: string;
    refund: string | null;
    kept: string | null;
    bookingUrl: string;
  };
  /** The date filled while they were paying: their payment is refunded. */
  catering_date_taken: {
    businessName: string;
    ownerEmail: string;
    when: string;
    amount: string;
    pageUrl: string;
  };
  catering_date_taken_owner: { hostName: string; email: string; when: string; amount: string };
  /** The nurture drip after the first pay link (lib/drip.ts writes the copy). Marketing. */
  nurture: { subject: string; body: string };
  catering_payment_disputed: { hostName: string; amount: string; when: string; bookingUrl: string };
  catering_dispute_closed: { hostName: string; amount: string; won: boolean; bookingUrl: string };
};

export type TemplateId = keyof TemplateData;

type Renderer<T extends TemplateId> = (data: TemplateData[T]) => RenderedMessage;

const renderers: { [T in TemplateId]: Renderer<T> } = {
  deposit_request: (d) => ({
    subject: `Secure your ${d.serviceName} with ${d.businessName}`,
    text: `${d.businessName}: pay your ${d.amount} deposit to lock in ${d.serviceName} on ${d.when}: ${d.payUrl}`,
  }),
  booking_confirmed: (d) => ({
    subject: `You're booked with ${d.businessName}`,
    text: `You're booked! ${d.serviceName} with ${d.businessName} on ${d.when}. Your ${d.amount} deposit is paid. ${d.cancelNote} Details, policy or cancel: ${d.detailsUrl}${d.proInviteUrl ? `\n\nAre you a pro too? Take deposits like this: ${d.proInviteUrl}` : ""}`,
    ...(d.calendar
      ? {
          attachments: [
            {
              filename: "appointment.ics",
              content: d.calendar,
              contentType: "text/calendar; charset=utf-8; method=PUBLISH",
            },
          ],
        }
      : {}),
  }),
  tech_deposit_paid: (d) => ({
    subject: `${d.clientName} paid their ${d.amount} deposit`,
    text: `${d.clientName} paid their ${d.amount} deposit for ${d.serviceName} on ${d.when}. ${d.appointmentUrl}${d.cardNote ? `\n\n${d.cardNote}` : ""}`,
  }),
  appointment_reminder: (d) => ({
    subject: `Reminder: ${d.serviceName} on ${d.when}`,
    text: `Reminder from ${d.businessName}: ${d.serviceName} on ${d.when}. ${d.cancelNote} Details or cancel: ${d.manageUrl}`,
  }),
  cancellation_confirmed: (d) => ({
    subject: `Your appointment with ${d.businessName} is cancelled`,
    text: d.refunded
      ? d.refundFromProvider
        ? `Your ${d.serviceName} with ${d.businessName} on ${d.when} is cancelled. ${d.businessName} will send your ${d.amount} deposit back the same way you paid it.`
        : `Your ${d.serviceName} with ${d.businessName} on ${d.when} is cancelled. Your ${d.amount} deposit is being refunded; it can take 5 to 10 business days to show up.`
      : `Your ${d.serviceName} with ${d.businessName} on ${d.when} is cancelled. Because it was less than ${d.windowHours} hours before, your ${d.amount} deposit was kept per the policy.`,
  }),
  client_cancelled: (d) => ({
    subject: `${d.clientName} cancelled ${d.when}`,
    text: d.refunded
      ? `${d.clientName} cancelled ${d.serviceName} on ${d.when}, early enough for a refund, so their ${d.amount} deposit was returned. That time is open again. ${d.appointmentUrl}`
      : `${d.clientName} cancelled ${d.serviceName} on ${d.when} inside your cancellation window, so you keep their ${d.amount} deposit. That time is open again. ${d.appointmentUrl}`,
  }),
  setup_nudge_first: (d) => ({
    subject: `Your first ${APP_NAME} pay link is a few taps away`,
    text: `${d.nextStep} Paste the pay link into your DMs: your client agrees to your policy and pays the deposit before the slot is theirs. If they don't show, you keep it. ${trialLine(d.freeUntil)}${d.dashboardUrl}`,
  }),
  setup_nudge_next_booking: (d) => ({
    subject: `Before your next booking, send a ${APP_NAME} pay link`,
    text: `Next time a client asks for a time in your DMs, send a pay link instead of your Cash App. They agree to your policy, get reminders, and you keep the deposit if they don't show. ${d.nextStep} ${trialLine(d.freeUntil)}This is our last setup reminder. ${d.dashboardUrl}`,
  }),
  founder_welcome: (d) => ({
    subject: `You're set up on ${APP_NAME}`,
    fromName: `${FOUNDER_NAME} at ${APP_NAME}`,
    replyTo: FOUNDER_EMAIL,
    text: `Hi, I'm ${FOUNDER_NAME}, I built ${APP_NAME}. Thanks for signing up.

${
  d.needsHandle
    ? `First, add the Cash App, Zelle or Venmo clients should pay (1 minute): ${d.appUrl}/dashboard/payments

Then `
    : "Here's all you need to do: "
}next time a client asks for a time in your DMs, open ${APP_NAME}, tap New appointment and send them the pay link. They agree to your policy and pay the deposit before the slot is theirs. If they don't show, you keep it.
${
  d.nextLink
    ? `
Your first pay link doesn't need a card. ${d.nextLink.freeUntil ? `When you send your second, you'll add one: $0 that day, and you're free until ${d.nextLink.freeUntil} (cancel anytime).` : `To send more after that, it's ${d.nextLink.price}/month, cancel anytime.`}
`
    : ""
}
${d.pageUrl ? `Put your own page in your Instagram bio: ${d.pageUrl}\nNew clients see your services, prices and deposit policy before they message you, so they show up in your DMs ready to book (and you get fewer "how much?" messages). On Instagram: Edit profile, Links, Add external link.\n` : ""}${d.signInUrl ? `Open ${APP_NAME} on your phone, already signed in (one tap): ${d.signInUrl}` : `Your dashboard: ${d.appUrl}/dashboard`}
See what your client sees: ${d.appUrl}/demo

${FOUNDER_NAME}`,
  }),
  founder_checkin: (d) => ({
    subject: "Your first pay link, sorted",
    fromName: `${FOUNDER_NAME} at ${APP_NAME}`,
    replyTo: FOUNDER_EMAIL,
    text: `Hi, ${FOUNDER_NAME} from ${APP_NAME}. You haven't sent your first pay link yet, so here are the answers to what usually holds people up:

Not sure how it looks to your client? Try a demo pay link (nothing is charged): ${d.appUrl}/demo

Still showing example prices? Set your own in a minute: ${d.appUrl}/dashboard/services

Worried your regulars will push back? Send them this first:
"${d.announcement}"

${d.freeUntil ? `Wondering about the card? Your first pay link doesn't need one. After that, you're not charged until ${d.freeUntil}, and you can cancel anytime` : `Wondering about the cost? Your first pay link is included; after that it's ${d.price}/month, and you can cancel anytime`}: ${d.appUrl}/dashboard/billing

When a client asks for a time, tap New appointment and send the link: ${d.appUrl}/dashboard

${FOUNDER_NAME}`,
  }),
  trial_ending: (d) => ({
    subject: `Your ${APP_NAME} trial ends ${d.endsOn}`,
    text: `${d.savings ? `${d.savings} ` : ""}Your free trial ends ${d.endsOn}. After that it's ${d.amount}/month on the card you added, so your pay links and reminders keep working. Nothing to do if you're staying. If you cancel, you can't send new pay links after ${d.endsOn}, and no-shows go back to costing you. To change your card or cancel: ${d.billingUrl}`,
  }),
  subscription_payment_failed: (d) => ({
    subject: `Your ${APP_NAME} payment didn't go through`,
    text: `We couldn't charge your card for your ${d.amount} ${APP_NAME} subscription. Stripe will retry, but please update your card so you can keep sending pay links: ${d.billingUrl}`,
  }),
  manual_deposit_sent: (d) => ({
    subject: `${d.clientName} says they sent their ${d.amount} deposit`,
    text: `${d.clientName} says they sent ${d.amount} by ${d.app} for ${d.when}. Check your ${d.app}, then tap Received to confirm the booking: ${d.appointmentUrl}${d.cardNote ? `\n\n${d.cardNote}` : ""}`,
  }),
  first_link_followup: (d) => ({
    subject: "Your first pay link is out. Here's what's next",
    text: `Nice, your first ${APP_NAME} pay link is out. Your next one needs your card: ${d.freeUntil ? `$0 today, and you're free until ${d.freeUntil} (cancel anytime)` : `it's ${d.price}/month, cancel anytime`}. Add it now so your next booking is one tap: ${d.billingUrl}`,
  }),
  manual_deposit_not_received: (d) => ({
    subject: `${d.businessName} hasn't received your deposit yet`,
    text: `${d.businessName} hasn't received your ${d.amount} deposit yet, so your spot isn't confirmed. Please check that it went through, or message them. Your link: ${d.payUrl}`,
  }),
  manual_refund_due: (d) => ({
    subject: `Send ${d.clientName} their ${d.amount} refund`,
    text: `${d.reason} Send ${d.clientName} their ${d.amount} deposit back the way they paid, then tap "I sent the refund": ${d.appointmentUrl}`,
  }),
  no_show_recorded: (d) => ({
    subject: `Missed appointment with ${d.businessName}`,
    text: `${d.businessName} marked your ${d.when} appointment as a no-show. Your ${d.amount} deposit was kept per their policy.`,
  }),
  deposit_disputed: (d) => ({
    subject: `${d.clientName} disputed their ${d.amount} deposit`,
    text: `${d.clientName} disputed their ${d.amount} deposit for ${d.when} with their bank. We sent the bank the policy they agreed to before paying. While the bank reviews it, the deposit is held back from your Stripe balance; if the bank sides with you, it comes back. Details: ${d.appointmentUrl}`,
  }),
  deposit_dispute_closed: (d) => ({
    subject: d.won
      ? `You won the dispute over ${d.clientName}'s deposit`
      : `The bank sided with ${d.clientName} on their deposit`,
    text: d.won
      ? `The bank ruled in your favor on ${d.clientName}'s ${d.amount} deposit. The money is back in your Stripe balance. ${d.appointmentUrl}`
      : `The bank ruled for ${d.clientName} on their ${d.amount} deposit, so it went back to them. ${d.appointmentUrl}`,
  }),
  dispute_alert: (d) => ({
    subject: `Dispute: ${d.amount}`,
    text: `${d.summary} Evidence was submitted automatically where Dibs had it. Response due by ${d.dueBy}: ${d.disputeUrl}`,
  }),
  deposit_refunded: (d) => ({
    subject: `Your ${d.amount} deposit is being refunded`,
    text: d.fromProvider
      ? `${d.businessName} cancelled your appointment and will send your ${d.amount} deposit back the same way you paid it.`
      : `${d.businessName} refunded your ${d.amount} deposit. It can take 5 to 10 business days to show up.`,
  }),
  catering_booked_host: (d) => ({
    subject: `You're booked with ${d.businessName} for ${d.when}`,
    fromName: d.businessName,
    replyTo: d.ownerEmail,
    text: `Your date is held! ${d.businessName} is booked for ${d.when}: ${d.packageName}, ${d.guests} guests. Total ${d.total}, ${d.paid} paid.${d.balanceLine ? ` Balance: ${d.balanceLine}.` : " You're paid in full."} Details and receipt: ${d.statusUrl}\n\nQuestions? Just reply to this email.\n\n— sent via ${APP_NAME}`,
    attachments: [
      ...(d.calendar
        ? [
            {
              filename: "event.ics",
              content: d.calendar,
              contentType: "text/calendar; charset=utf-8; method=PUBLISH",
            },
          ]
        : []),
      ...(d.agreement
        ? [
            {
              filename: "agreement.txt",
              content: d.agreement,
              contentType: "text/plain; charset=utf-8",
            },
          ]
        : []),
    ],
  }),
  catering_booked_owner: (d) => ({
    subject: `Booked: ${d.when}, ${d.guests} guests`,
    text: `New catering booking: ${d.hostName}, ${d.when}, ${d.guests} guests, ${d.packageName}. Total ${d.total}, ${d.paid} paid. ${d.bookingUrl}${d.cardNote ? `\n\n${d.cardNote}` : ""}`,

    ...(d.agreement
      ? {
          attachments: [
            {
              filename: "agreement.txt",
              content: d.agreement,
              contentType: "text/plain; charset=utf-8",
            },
          ],
        }
      : {}),
  }),
  catering_balance_reminder: (d) => ({
    subject: `Your balance for ${d.when} is due ${d.dueDate}`,
    fromName: d.businessName,
    replyTo: d.ownerEmail,
    text: `Reminder from ${d.businessName}: the ${d.balance} balance for your event on ${d.when} is due ${d.dueDate}. Pay it here: ${d.payUrl}\n\n— sent via ${APP_NAME}`,
  }),
  catering_balance_overdue: (d) => ({
    subject: `${d.hostName}'s balance is overdue`,
    text: `${d.hostName} hasn't paid the ${d.balance} balance for ${d.when} (due ${d.dueDate}). We've reminded them twice. Reach out, or open the booking: ${d.bookingUrl}`,
  }),
  catering_balance_paid_host: (d) => ({
    subject: `Receipt: ${d.amount} paid to ${d.businessName}`,
    fromName: d.businessName,
    replyTo: d.ownerEmail,
    text: `Thanks! Your ${d.amount} balance is paid, so your event on ${d.when} is paid in full. Receipt and details: ${d.statusUrl}\n\n— sent via ${APP_NAME}`,
  }),
  catering_balance_paid_owner: (d) => ({
    subject: `${d.hostName} paid in full`,
    text: `${d.hostName} paid their ${d.amount} balance for ${d.when}. The event is paid in full. ${d.bookingUrl}`,
  }),
  catering_day_before: (d) => ({
    subject: `Tomorrow: ${d.when}, ${d.guests} guests`,
    text: `Tomorrow: ${d.when}
${d.packageName}, ${d.guests} guests${d.addOns ? `\nAdd-ons: ${d.addOns}` : ""}
Where: ${d.address}
Host: ${d.hostName}${d.hostPhone ? `, ${d.hostPhone}` : ""}${d.notes ? `\nNotes: ${d.notes}` : ""}
${d.bookingUrl}`,
  }),
  catering_cancelled_host: (d) => ({
    subject: `${d.businessName} cancelled your event on ${d.when}`,
    fromName: d.businessName,
    replyTo: d.ownerEmail,
    text: `${d.businessName} cancelled your event on ${d.when}.${d.reason ? ` Their note: "${d.reason}"` : ""}${d.refunded ? ` We've refunded the ${d.refunded} you paid in full; it can take 5 to 10 business days to show up.` : ""} Questions? Just reply to this email.\n\n— sent via ${APP_NAME}`,
  }),
  catering_host_cancelled_host: (d) => ({
    subject: `Your event on ${d.when} is cancelled`,
    fromName: d.businessName,
    replyTo: d.ownerEmail,
    text: `You cancelled your event with ${d.businessName} on ${d.when}.${d.refund ? ` We've refunded ${d.refund}; it can take 5 to 10 business days to show up.` : ""}${d.kept ? ` The ${d.kept} deposit is kept, as your agreement says.` : ""}\n\n— sent via ${APP_NAME}`,
  }),
  catering_host_cancelled_owner: (d) => ({
    subject: `${d.hostName} cancelled ${d.when}`,
    text: `${d.hostName} cancelled their event on ${d.when}. ${d.refund ? `${d.refund} was refunded automatically.` : "Nothing was refunded."}${d.kept ? ` You keep the ${d.kept} deposit.` : ""} The date is open again on your page. ${d.bookingUrl}`,
  }),
  catering_date_taken: (d) => ({
    subject: `${d.when} just filled up: your ${d.amount} is refunded`,
    fromName: d.businessName,
    replyTo: d.ownerEmail,
    text: `Sorry! ${d.businessName}'s last opening on ${d.when} was booked while you were paying, so we refunded your ${d.amount} in full (5 to 10 business days). Pick another date: ${d.pageUrl}\n\n— sent via ${APP_NAME}`,
  }),
  nurture: (d) => ({ subject: d.subject, text: d.body }),
  catering_payment_disputed: (d) => ({
    subject: `${d.hostName} disputed a ${d.amount} payment`,
    text: `${d.hostName} disputed their ${d.amount} payment for ${d.when} with their bank. We've sent the bank the agreement they signed. Until the bank decides, the ${d.amount} is held back from your Stripe balance; if the dispute is won, it comes back to you. ${d.bookingUrl}`,
  }),
  catering_dispute_closed: (d) => ({
    subject: d.won ? `You won ${d.hostName}'s dispute` : `${d.hostName}'s dispute was lost`,
    text: d.won
      ? `The bank sided with you on ${d.hostName}'s ${d.amount} dispute. The money is back in your Stripe balance. ${d.bookingUrl}`
      : `The bank sided with ${d.hostName} on the ${d.amount} dispute, so that amount went back to them. ${d.bookingUrl}`,
  }),
  catering_date_taken_owner: (d) => ({
    subject: `A payment for ${d.when} was refunded (date full)`,
    text: `${d.hostName} (${d.email}) paid ${d.amount} for ${d.when} after the date filled up, so it was refunded automatically. You may want to reach out with another date.`,
  }),
};

export function render<T extends TemplateId>(template: T, data: TemplateData[T]): RenderedMessage {
  const message: RenderedMessage = renderers[template](data);
  // Personal notes from a named sender read as letters, without the app footer.
  if (message.fromName) return message;
  return { ...message, text: `${message.text}\n\n— sent via ${APP_NAME}` };
}

function trialLine(freeUntil: string | null): string {
  return freeUntil
    ? `Your first pay link needs no card. You add one for the next, and you're not charged until ${freeUntil}. `
    : "";
}
