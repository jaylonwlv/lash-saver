import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";
import type { Notifier, Recipient, RenderedMessage, SendResult } from "./types";

export class ResendEmailNotifier implements Notifier {
  readonly channel = "email" as const;
  private client: Resend;

  constructor(
    apiKey: string,
    private from: string,
    private replyTo?: string,
  ) {
    this.client = new Resend(apiKey);
  }

  canReach(to: Recipient) {
    return Boolean(to.email);
  }

  async send(to: Recipient, message: RenderedMessage): Promise<SendResult> {
    if (!to.email) return { ok: false, channel: this.channel, error: "No email address" };

    const { data, error } = await this.client.emails.send({
      from: this.from,
      to: to.email,
      replyTo: this.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    if (error) return { ok: false, channel: this.channel, error: error.message };
    return { ok: true, channel: this.channel, providerMessageId: data?.id };
  }
}

export function createEmailNotifier(): Notifier {
  const env = serverEnv();
  return new ResendEmailNotifier(env.RESEND_API_KEY, env.EMAIL_FROM, env.EMAIL_REPLY_TO);
}
