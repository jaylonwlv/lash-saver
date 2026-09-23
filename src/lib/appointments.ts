import "server-only";
import { publicEnv } from "@/lib/env.public";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type AppointmentStatus = Enums<"appointment_status">;

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending_deposit: "Waiting for deposit",
  confirmed: "Confirmed",
  completed: "Completed",
  no_show: "No-show",
  cancelled_by_client: "Cancelled by client",
  cancelled_by_tech: "Cancelled",
  expired: "Pay link expired",
};

export const payUrl = (appointmentId: string) =>
  `${publicEnv().NEXT_PUBLIC_APP_URL}/pay/${appointmentId}`;
export const appointmentUrl = (appointmentId: string) =>
  `${publicEnv().NEXT_PUBLIC_APP_URL}/dashboard/appointments/${appointmentId}`;

export type AppointmentContext = {
  appointment: Tables<"appointments">;
  serviceName: string;
  tech: Pick<
    Tables<"profiles">,
    | "id"
    | "email"
    | "business_name"
    | "instagram_handle"
    | "timezone"
    | "cancellation_window_hours"
    | "policy_text"
    | "stripe_account_id"
    | "stripe_charges_enabled"
  >;
};

/**
 * Loads an appointment with its tech and service name, bypassing RLS. For the
 * public pay page and webhooks only; callers must not expose data beyond what
 * the pay link's holder should see.
 */
export async function loadAppointmentContext(
  appointmentId: string,
): Promise<AppointmentContext | null> {
  const admin = createAdminClient();
  const { data: appointment, error } = await admin
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) throw new Error(`Loading appointment failed: ${error.message}`);
  if (!appointment) return null;

  const [{ data: tech, error: techError }, { data: service }] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, email, business_name, instagram_handle, timezone, cancellation_window_hours, policy_text, stripe_account_id, stripe_charges_enabled",
      )
      .eq("id", appointment.tech_id)
      .single(),
    appointment.service_id
      ? admin.from("services").select("name").eq("id", appointment.service_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (techError || !tech) throw new Error(`Loading tech failed: ${techError?.message}`);

  return { appointment, tech, serviceName: service?.name ?? "Appointment" };
}

/** Whether a client can pay this appointment's deposit right now. */
export function payability(
  appointment: Pick<Tables<"appointments">, "status" | "hold_expires_at" | "starts_at">,
  now = new Date(),
): "ok" | "expired" | "closed" {
  if (appointment.status !== "pending_deposit") return "closed";
  const deadline = appointment.hold_expires_at ?? appointment.starts_at;
  if (new Date(deadline) <= now || new Date(appointment.starts_at) <= now) return "expired";
  return "ok";
}

/** Plain-language cancellation rule plus the tech's own policy text. */
export function policySummary(windowHours: number, policyText: string | null): string {
  const rule =
    windowHours > 0
      ? `Cancel or reschedule at least ${windowHours} hours before your appointment to get your deposit back. Later cancellations and no-shows lose the deposit.`
      : "Your deposit is refundable if you cancel before your appointment. No-shows lose the deposit.";
  return policyText ? `${rule}\n\n${policyText}` : rule;
}
