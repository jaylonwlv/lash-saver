import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_NAME } from "@/lib/config";
import { formatCents } from "@/lib/money";
import type { Database } from "@/lib/supabase/database.types";

/*
 * What Dibs has done for a pro, from their own appointments: deposits kept from
 * no-shows and late cancels (minus any a bank took back in a dispute), clients
 * who cancelled early enough for the slot to be refilled, and the show rate.
 * Shown on the dashboard and in the trial-ending email.
 */

export type Savings = {
  keptCents: number;
  /** No-shows whose deposit was kept (the rest count only toward the show rate). */
  noShowsKept: number;
  noShows: number;
  lateCancels: number;
  earlyCancels: number;
  completed: number;
  /** Completed ÷ (completed + no-shows), once there are enough to mean something. */
  showRate: number | null;
};

const MIN_FOR_SHOW_RATE = 3;

export async function loadSavings(
  supabase: SupabaseClient<Database>,
  techId: string,
): Promise<Savings> {
  const [appointments, deposits] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, status")
      .eq("tech_id", techId)
      .in("status", ["completed", "no_show", "cancelled_by_client"])
      .limit(10_000),
    supabase
      .from("deposits")
      .select("appointment_id, status, amount_cents, dispute_status")
      .eq("tech_id", techId)
      .in("status", ["forfeited", "refunded", "refund_due"])
      .limit(10_000),
  ]);
  if (appointments.error)
    throw new Error(`Loading appointments failed: ${appointments.error.message}`);
  if (deposits.error) throw new Error(`Loading deposits failed: ${deposits.error.message}`);

  // An appointment can also have a refunded duplicate payment; the kept one wins.
  const depositFor = new Map<string, (typeof deposits.data)[number]>();
  for (const d of deposits.data) {
    if (depositFor.get(d.appointment_id)?.status !== "forfeited")
      depositFor.set(d.appointment_id, d);
  }
  const s: Savings = {
    keptCents: 0,
    noShowsKept: 0,
    noShows: 0,
    lateCancels: 0,
    earlyCancels: 0,
    completed: 0,
    showRate: null,
  };

  for (const a of appointments.data) {
    const d = depositFor.get(a.id);
    const kept = d?.status === "forfeited" && d.dispute_status !== "lost";
    if (a.status === "completed") s.completed++;
    if (a.status === "no_show") {
      s.noShows++;
      if (kept) {
        s.noShowsKept++;
        s.keptCents += d.amount_cents;
      }
    }
    if (a.status === "cancelled_by_client") {
      if (kept) {
        s.lateCancels++;
        s.keptCents += d.amount_cents;
      } else if (d?.status === "refunded" || d?.status === "refund_due") {
        s.earlyCancels++;
      }
    }
  }
  const finished = s.completed + s.noShows;
  if (finished >= MIN_FOR_SHOW_RATE) s.showRate = s.completed / finished;
  return s;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "<APP_NAME> has saved you $120" and the lines under it, or null before anything happened. */
export function savingsSummary(s: Savings): { headline: string; lines: string[] } | null {
  const lines: string[] = [];
  const keptFrom = [
    s.noShowsKept && plural(s.noShowsKept, "no-show"),
    s.lateCancels && plural(s.lateCancels, "late cancel"),
  ].filter(Boolean);
  if (s.keptCents > 0)
    lines.push(`${formatCents(s.keptCents)} kept from ${keptFrom.join(" and ")}`);
  if (s.earlyCancels)
    lines.push(`${plural(s.earlyCancels, "slot")} freed early, with time to rebook`);
  if (s.showRate !== null)
    lines.push(
      `${Math.round(s.showRate * 100)}% show rate (${s.completed} of ${s.completed + s.noShows})`,
    );

  const headline =
    s.keptCents > 0
      ? formatCents(s.keptCents).replace(".00", "")
      : s.earlyCancels
        ? plural(s.earlyCancels, "empty slot")
        : null;
  if (headline) return { headline: `${APP_NAME} has saved you ${headline}`, lines };
  // Nothing kept or freed yet, but clients are showing up with a deposit paid.
  if (s.completed)
    return { headline: `${plural(s.completed, "client")} showed up, deposit paid first`, lines };
  return null;
}
