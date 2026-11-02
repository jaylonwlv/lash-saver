import "server-only";
import { createEmailNotifier } from "./email-resend";
import { createSmsNotifier } from "./sms";
import { render, type TemplateData, type TemplateId } from "./templates";
import type { Channel, Notifier, Recipient, RenderedMessage, SendResult } from "./types";
import { APP_NAME } from "@/lib/config";

export type { Channel, Recipient, SendResult } from "./types";
export type { TemplateId, TemplateData } from "./templates";

function withMarketingFooter(
  message: RenderedMessage,
  m: { page: string; oneClick: string; postalAddress: string | null },
): RenderedMessage {
  const footer = `You're getting this because you signed up for ${APP_NAME}. Stop these tips: ${m.page}${m.postalAddress ? `\n${APP_NAME}, ${m.postalAddress}` : ""}`;
  return {
    ...message,
    text: `${message.text}\n\n${footer}`,
    headers: {
      ...message.headers,
      "List-Unsubscribe": `<${m.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

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
  /**
   * Marketing email (tips, offers, nudges to subscribe): adds the unsubscribe link and
   * postal address CAN-SPAM requires, plus one-click unsubscribe headers (RFC 8058).
   * Callers check the opt-out first (notifications/log.ts notifyMarketingOnce).
   */
  marketing?: { page: string; oneClick: string; postalAddress: string | null };
}): Promise<SendResult[]> {
  const rendered = render(args.template, args.data);
  const message = args.marketing ? withMarketingFooter(rendered, args.marketing) : rendered;
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
