import { APP_NAME } from "@/lib/config";
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
  };
  /** To the tech, when a client pays. */
  tech_deposit_paid: {
    clientName: string;
    serviceName: string;
    when: string;
    amount: string;
    appointmentUrl: string;
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
  };
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
  /** To the tech, a few days before the first subscription charge. */
  trial_ending: { endsOn: string; amount: string; billingUrl: string };
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
    text: `You're booked! ${d.serviceName} with ${d.businessName} on ${d.when}. Your ${d.amount} deposit is paid. ${d.cancelNote} Details, policy or cancel: ${d.detailsUrl}`,
  }),
  tech_deposit_paid: (d) => ({
    subject: `${d.clientName} paid their ${d.amount} deposit`,
    text: `${d.clientName} paid their ${d.amount} deposit for ${d.serviceName} on ${d.when}. ${d.appointmentUrl}`,
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
  trial_ending: (d) => ({
    subject: `Your ${APP_NAME} trial ends ${d.endsOn}`,
    text: `Your free trial ends ${d.endsOn}. After that it's ${d.amount}/month on the card you added, so your pay links and reminders keep working. Nothing to do if you're staying. To change your card or cancel: ${d.billingUrl}`,
  }),
  subscription_payment_failed: (d) => ({
    subject: `Your ${APP_NAME} payment didn't go through`,
    text: `We couldn't charge your card for your ${d.amount} ${APP_NAME} subscription. Stripe will retry, but please update your card so you can keep sending pay links: ${d.billingUrl}`,
  }),
  manual_deposit_sent: (d) => ({
    subject: `${d.clientName} says they sent their ${d.amount} deposit`,
    text: `${d.clientName} says they sent ${d.amount} by ${d.app} for ${d.when}. Check your ${d.app}, then tap Received to confirm the booking: ${d.appointmentUrl}`,
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
};

export function render<T extends TemplateId>(template: T, data: TemplateData[T]): RenderedMessage {
  const message = renderers[template](data);
  return { ...message, text: `${message.text}\n\n— sent via ${APP_NAME}` };
}
