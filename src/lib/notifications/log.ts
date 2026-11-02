import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { unsubscribeUrls } from "@/lib/unsubscribe";
import { notify } from "./index";
import type { TemplateData, TemplateId } from "./templates";
import type { Recipient } from "./types";

/**
 * notify() for messages about an appointment: sends, then records each attempt
 * in notification_log. Scheduled jobs check that log so they don't send twice.
 */
export async function notifyForAppointment<T extends TemplateId>(args: {
  appointmentId: string;
  to: Recipient;
  template: T;
  data: TemplateData[T];
  /** Name recorded in notification_log, when one template is sent at several times. */
  logAs?: string;
}): Promise<void> {
  const results = await notify({ to: args.to, template: args.template, data: args.data });
  if (results.length === 0) return;

  const { error } = await createAdminClient()
    .from("notification_log")
    .insert(
      results.map((r) => ({
        appointment_id: args.appointmentId,
        template: args.logAs ?? args.template,
        channel: r.channel,
        provider_message_id: r.ok ? (r.providerMessageId ?? null) : null,
        error: r.ok ? null : r.error,
      })),
    );
  if (error) console.error("Writing notification_log failed", error);
  for (const r of results) {
    if (!r.ok) console.error(`Sending ${args.template} by ${r.channel} failed: ${r.error}`);
  }
}

/** True if a message was already sent under `logKey` (see notifyOnce). */
export async function alreadyLogged(logKey: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("notification_log")
    .select("id")
    .eq("template", logKey)
    .is("error", null)
    .limit(1);
  return Boolean(data?.length);
}

/**
 * Send a message that isn't about an appointment and log it under `logKey`, so a
 * caller that checks alreadyLogged first sends it once.
 */
export async function notifyOnce<T extends TemplateId>(
  logKey: string,
  input: { to: Recipient; template: T; data: TemplateData[T] },
): Promise<boolean> {
  const results = await notify(input);
  await createAdminClient()
    .from("notification_log")
    .insert(
      results.map((r) => ({
        appointment_id: null,
        template: logKey,
        channel: r.channel,
        provider_message_id: r.ok ? (r.providerMessageId ?? null) : null,
        error: r.ok ? null : r.error,
      })),
    );
  return results.some((r) => r.ok);
}

/**
 * notifyOnce for marketing email to a pro (tips, nudges to subscribe): skipped if they
 * unsubscribed, and sent with the unsubscribe link, postal address and one-click
 * headers. Returns false when not sent (opted out or failed).
 */
export async function notifyMarketingOnce<T extends TemplateId>(
  logKey: string,
  techId: string,
  input: { to: Recipient; template: T; data: TemplateData[T] },
): Promise<boolean> {
  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("marketing_opt_out_at")
    .eq("id", techId)
    .maybeSingle();
  if (!profile || profile.marketing_opt_out_at) return false;
  const results = await notify({
    ...input,
    marketing: {
      ...unsubscribeUrls(techId),
      postalAddress: serverEnv().MAIL_POSTAL_ADDRESS ?? null,
    },
  });
  await createAdminClient()
    .from("notification_log")
    .insert(
      results.map((r) => ({
        appointment_id: null,
        template: logKey,
        channel: r.channel,
        provider_message_id: r.ok ? (r.providerMessageId ?? null) : null,
        error: r.ok ? null : r.error,
      })),
    );
  return results.some((r) => r.ok);
}
