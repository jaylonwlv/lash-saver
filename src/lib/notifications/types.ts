export type Channel = "email" | "sms";

/** Who we're contacting. Clients may have an email, a phone, or both. */
export type Recipient = {
  name?: string;
  email?: string | null;
  phone?: string | null;
};

/** A message already rendered for sending. `text` is used as the SMS body. */
export type RenderedMessage = {
  subject: string;
  text: string;
  html?: string;
  /** Sender name instead of the app's (same address), e.g. "Jaylon at Dibs". */
  fromName?: string;
  /** Where replies go, instead of EMAIL_REPLY_TO. */
  replyTo?: string;
  /** Email only (texts can't carry files), e.g. a calendar invite. */
  attachments?: { filename: string; content: string; contentType: string }[];
};

export type SendResult =
  | { ok: true; channel: Channel; providerMessageId?: string }
  | { ok: false; channel: Channel; error: string };

/**
 * One implementation per channel/provider. To add texting, implement this
 * with `channel: "sms"` and register it in `index.ts`. Nothing else changes.
 */
export interface Notifier {
  readonly channel: Channel;
  /** True if this notifier can reach the recipient (for example, they have a phone number). */
  canReach(to: Recipient): boolean;
  send(to: Recipient, message: RenderedMessage): Promise<SendResult>;
}
