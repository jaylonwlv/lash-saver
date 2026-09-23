import "server-only";
import { createEmailNotifier } from "./email-resend";
import { createSmsNotifier } from "./sms";
import { render, type TemplateData, type TemplateId } from "./templates";
import type { Channel, Notifier, Recipient, SendResult } from "./types";

export type { Channel, Recipient, SendResult } from "./types";
export type { TemplateId, TemplateData } from "./templates";

function notifiers(): Notifier[] {
  return [createEmailNotifier(), createSmsNotifier()].filter((n): n is Notifier => n !== null);
}

/**
 * The only way app code sends messages. Renders the template and sends it
 * on every configured channel that can reach the recipient (or only on
 * `channels`, if given). Never throws on delivery failure; check the results.
 */
export async function notify<T extends TemplateId>(args: {
  to: Recipient;
  template: T;
  data: TemplateData[T];
  channels?: Channel[];
}): Promise<SendResult[]> {
  const message = render(args.template, args.data);
  const targets = notifiers().filter(
    (n) => (!args.channels || args.channels.includes(n.channel)) && n.canReach(args.to),
  );

  return Promise.all(
    targets.map((n) =>
      n.send(args.to, message).catch((err: unknown): SendResult => ({
        ok: false,
        channel: n.channel,
        error: err instanceof Error ? err.message : String(err),
      })),
    ),
  );
}
