import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";

/*
 * A pro's client list, built from their appointments (no separate table, nothing
 * extra collected). Clients are matched by email, or by phone for appointments
 * without one (joined to the email client who used that phone; see clientMatcher). Each carries their record: visits, no-shows and late cancels, so
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
  /** Their most recent service and deposit, so "Book again" starts from them. */
  lastServiceId: string | null;
  lastDepositCents: number | null;
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
  | "deposit_cents"
>;

const emailOf = (a: { client_email: string | null }) =>
  a.client_email?.trim().toLowerCase() || null;
/** Digits only, without a US "+1", so "+1 (702) 555-0199" and "702.555.0199" match. */
export function phoneDigits(phone: string | null | undefined): string | null {
  const d = phone?.replace(/\D/g, "") ?? "";
  return (d.length === 11 && d.startsWith("1") ? d.slice(1) : d) || null;
}
const phoneOf = (a: { client_phone: string | null }) => phoneDigits(a.client_phone);

/**
 * Who each appointment belongs to. Email decides. An appointment with only a phone
 * joins the client who used that phone with their email (a pro who typed just the
 * number, then the client added their email on the pay page). A phone seen with
 * two or more emails (a parent booking for two kids) stays its own client, so
 * different people are never merged.
 */
export function clientMatcher(
  appointments: { client_email: string | null; client_phone: string | null }[],
) {
  const emailsByPhone = new Map<string, Set<string>>();
  for (const a of appointments) {
    const email = emailOf(a);
    const phone = phoneOf(a);
    if (!email || !phone) continue;
    const set = emailsByPhone.get(phone) ?? new Set<string>();
    set.add(email);
    emailsByPhone.set(phone, set);
  }
  /** "p:<digits>" → the client's email key when that phone belongs to exactly one. */
  const resolve = (key: string) => {
    if (!key.startsWith("p:")) return key;
    const phone = phoneDigits(key.slice(2));
    if (!phone) return key;
    const emails = emailsByPhone.get(phone);
    return emails?.size === 1 ? `e:${[...emails][0]}` : `p:${phone}`;
  };
  const keyOf = (a: { client_email: string | null; client_phone: string | null }) => {
    const email = emailOf(a);
    if (email) return `e:${email}`;
    const phone = phoneOf(a);
    return phone ? resolve(`p:${phone}`) : null;
  };
  return { keyOf, resolve };
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
        "id, client_name, client_email, client_phone, client_instagram, starts_at, status, service_id, deposit_cents",
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
  const { keyOf } = clientMatcher(appointments);
  const byKey = new Map<string, ClientSummary>();
  for (const a of appointments) {
    const key = keyOf(a);
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
        lastServiceId: a.service_id,
        lastDepositCents: a.deposit_cents,
      };
      byKey.set(key, c);
    }
    c.email ??= a.client_email;
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

/** The client a link points at; an old "p:<digits>" link finds them once their email is known. */
export function findClient(clients: ClientSummary[], key: string | undefined) {
  if (!key) return undefined;
  return (
    clients.find((c) => c.key === key) ??
    (key.startsWith("p:")
      ? clients.find((c) => phoneDigits(c.phone) === phoneDigits(key.slice(2)))
      : undefined)
  );
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
