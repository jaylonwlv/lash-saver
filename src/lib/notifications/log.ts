import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
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
}): Promise<void> {
  const results = await notify({ to: args.to, template: args.template, data: args.data });
  if (results.length === 0) return;

  const { error } = await createAdminClient()
    .from("notification_log")
    .insert(
      results.map((r) => ({
        appointment_id: args.appointmentId,
        template: args.template,
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
