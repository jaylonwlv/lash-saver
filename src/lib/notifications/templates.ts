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
  booking_confirmed: { businessName: string; serviceName: string; when: string; policyUrl: string };
  appointment_reminder: {
    businessName: string;
    serviceName: string;
    when: string;
    manageUrl: string;
  };
  no_show_recorded: { businessName: string; when: string; amount: string };
  deposit_refunded: { businessName: string; amount: string };
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
    text: `You're booked! ${d.serviceName} with ${d.businessName} on ${d.when}. Policy: ${d.policyUrl}`,
  }),
  appointment_reminder: (d) => ({
    subject: `Reminder: ${d.serviceName} on ${d.when}`,
    text: `Reminder from ${d.businessName}: ${d.serviceName} on ${d.when}. Need to change it? ${d.manageUrl}`,
  }),
  no_show_recorded: (d) => ({
    subject: `Missed appointment with ${d.businessName}`,
    text: `${d.businessName} marked your ${d.when} appointment as a no-show. Your ${d.amount} deposit was kept per their policy.`,
  }),
  deposit_refunded: (d) => ({
    subject: `Your ${d.amount} deposit was refunded`,
    text: `${d.businessName} refunded your ${d.amount} deposit. It can take 5 to 10 business days to show up.`,
  }),
};

export function render<T extends TemplateId>(template: T, data: TemplateData[T]): RenderedMessage {
  const message = renderers[template](data);
  return { ...message, text: `${message.text}\n\n— sent via ${APP_NAME}` };
}
