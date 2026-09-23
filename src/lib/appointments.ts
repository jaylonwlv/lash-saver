import "server-only";
import { publicEnv } from "@/lib/env.public";
import { formatWhen } from "@/lib/time";
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

export type CancellationTerms = {
  /** Hours before the start a client must cancel by to get the deposit back. */
  windowHours: number;
  /** Last moment a cancellation is refunded. */
  refundDeadline: Date;
  /** Cancelling right now would be refunded. */
  refundable: boolean;
};

/** Refund rule for a client cancelling, using the policy they agreed to when they paid. */
export function cancellationTerms(
  appointment: Pick<Tables<"appointments">, "starts_at" | "cancellation_window_hours_snapshot">,
  techWindowHours: number,
  now = new Date(),
): CancellationTerms {
  const windowHours = appointment.cancellation_window_hours_snapshot ?? techWindowHours;
  const refundDeadline = new Date(
    new Date(appointment.starts_at).getTime() - windowHours * 3_600_000,
  );
  return { windowHours, refundDeadline, refundable: now <= refundDeadline };
}

/** One line for emails: when the client can still cancel for a refund. */
export function cancelNote(ctx: AppointmentContext, now = new Date()): string {
  const terms = cancellationTerms(ctx.appointment, ctx.tech.cancellation_window_hours, now);
  return terms.refundable
    ? `Can't make it? Cancel by ${formatWhen(terms.refundDeadline, ctx.tech.timezone)} to get your deposit back.`
    : "Can't make it? Please let us know. Cancelling now means the deposit is kept, per the policy.";
}

/** The deposit that holds (or held) money for an appointment, if any. */
export async function loadSettledDeposit(appointmentId: string) {
  const { data } = await createAdminClient()
    .from("deposits")
    .select("status, amount_cents")
    .eq("appointment_id", appointmentId)
    .in("status", ["paid", "applied", "forfeited", "refunded"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
