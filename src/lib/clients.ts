import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";

/*
 * A pro's client list, built from their appointments (no separate table, nothing
 * extra collected). Clients are matched by email, or by phone for appointments
 * without one. Each carries their record: visits, no-shows and late cancels, so
 * New appointment can warn about repeat no-shows before a slot is given away.
 */

export type ClientSummary = {
  /** Stable id for URLs: "e:<email>" or "p:<digits>". */
  key: string;
  name: string;
  email: string | null;
  instagram: string | null;
  phone: string | null;
  visits: number;
  noShows: number;
  lateCancels: number;
  earlyCancels: number;
  upcoming: number;
  /** Start of their most recent appointment (any status but expired). */
  lastAt: string | null;
};

type ClientAppointment = Pick<
  Tables<"appointments">,
  | "id"
  | "client_name"
  | "client_email"
  | "client_phone"
  | "client_instagram"
  | "starts_at"
  | "status"
  | "service_id"
>;

export function clientKey(a: { client_email: string | null; client_phone: string | null }) {
  const email = a.client_email?.trim().toLowerCase();
  if (email) return `e:${email}`;
  const digits = a.client_phone?.replace(/\D/g, "");
  return digits ? `p:${digits}` : null;
}

/** Repeat no-shows and late cancels: worth a bigger deposit next time. */
export function isFlaky(c: Pick<ClientSummary, "noShows" | "lateCancels">) {
  return c.noShows + c.lateCancels > 0;
}

export async function loadClientAppointments(
  supabase: SupabaseClient<Database>,
  techId: string,
): Promise<{ appointments: ClientAppointment[]; forfeited: Set<string> }> {
  const [appointments, deposits] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, client_name, client_email, client_phone, client_instagram, starts_at, status, service_id",
      )
      .eq("tech_id", techId)
      .neq("status", "expired")
      .order("starts_at", { ascending: false })
      .limit(10_000),
    supabase
      .from("deposits")
      .select("appointment_id")
      .eq("tech_id", techId)
      .eq("status", "forfeited")
      .limit(10_000),
  ]);
  if (appointments.error) throw new Error(`Loading clients failed: ${appointments.error.message}`);
  if (deposits.error) throw new Error(`Loading clients failed: ${deposits.error.message}`);
  return {
    appointments: appointments.data,
    forfeited: new Set(deposits.data.map((d) => d.appointment_id)),
  };
}

/** Most recent first. Name and contact details come from their latest appointment. */
export function summarizeClients(
  appointments: ClientAppointment[],
  forfeited: Set<string>,
  now = new Date(),
): ClientSummary[] {
  const byKey = new Map<string, ClientSummary>();
  for (const a of appointments) {
    const key = clientKey(a);
    if (!key) continue;
    let c = byKey.get(key);
    if (!c) {
      c = {
        key,
        name: a.client_name,
        email: a.client_email,
        instagram: a.client_instagram,
        phone: a.client_phone,
        visits: 0,
        noShows: 0,
        lateCancels: 0,
        earlyCancels: 0,
        upcoming: 0,
        lastAt: a.starts_at,
      };
      byKey.set(key, c);
    }
    c.instagram ??= a.client_instagram;
    c.phone ??= a.client_phone;
    if (a.status === "completed") c.visits++;
    if (a.status === "no_show") c.noShows++;
    if (a.status === "cancelled_by_client") {
      if (forfeited.has(a.id)) c.lateCancels++;
      else c.earlyCancels++;
    }
    if ((a.status === "confirmed" || a.status === "pending_deposit") && new Date(a.starts_at) > now)
      c.upcoming++;
  }
  return [...byKey.values()];
}

export async function loadClients(
  supabase: SupabaseClient<Database>,
  techId: string,
): Promise<ClientSummary[]> {
  const { appointments, forfeited } = await loadClientAppointments(supabase, techId);
  return summarizeClients(appointments, forfeited);
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** "6 visits · 2 no-shows · 1 late cancel" (only the parts that apply). */
export function clientRecord(c: ClientSummary): string {
  const parts = [plural(c.visits, "visit")];
  if (c.noShows) parts.push(plural(c.noShows, "no-show"));
  if (c.lateCancels) parts.push(plural(c.lateCancels, "late cancel"));
  if (c.upcoming) parts.push(`${c.upcoming} upcoming`);
  return parts.join(" · ");
}
