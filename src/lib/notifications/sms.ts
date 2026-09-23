import "server-only";
import { serverEnv } from "@/lib/env";
import type { Notifier, Recipient, RenderedMessage, SendResult } from "./types";

/** Dev stand-in for a real texting provider: logs the message instead of sending it. */
export class LogSmsNotifier implements Notifier {
  readonly channel = "sms" as const;

  canReach(to: Recipient) {
    return Boolean(to.phone);
  }

  async send(to: Recipient, message: RenderedMessage): Promise<SendResult> {
    console.info(`[sms:log] to=${to.phone} body=${JSON.stringify(message.text)}`);
    return { ok: true, channel: this.channel };
  }
}

/**
 * Returns the configured SMS notifier, or null if texting is off.
 * To add a provider (Twilio, etc.): implement Notifier in a new file,
 * add its name to SMS_PROVIDER in env.ts, and add a case here.
 */
export function createSmsNotifier(): Notifier | null {
  switch (serverEnv().SMS_PROVIDER) {
    case "log":
      return new LogSmsNotifier();
    case "none":
      return null;
  }
}
