import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { bookingStatusLabel } from "@/lib/catering/bookings";
import { formatShortDate, todayIn } from "@/lib/catering/dates";
import { formatCents } from "@/lib/money";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Catering bookings" };

export default async function CateringBookingsPage({
  searchParams,
}: PageProps<"/dashboard/catering/bookings">) {
  const { past } = await searchParams;
  const showPast = past === "1";
  const user = await getUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();
  const today = todayIn(profile?.timezone ?? "America/Los_Angeles");
  let query = supabase
    .from("catering_bookings")
    .select("id, event_date, host_name, guest_count, status, total_cents, balance_cents, quote")
    .neq("status", "awaiting_deposit")
    .neq("status", "expired");
  query = showPast
    ? query.lt("event_date", today).order("event_date", { ascending: false })
    : query.gte("event_date", today).order("event_date");
  const { data: bookings, error } = await query.limit(200);
  if (error) throw new Error(`Loading bookings failed: ${error.message}`);

  const tab = (active: boolean) =>
    `min-h-11 flex-1 rounded-xl text-center text-sm font-semibold leading-[2.75rem] ${active ? "bg-ink text-white" : "bg-surface border-line border"}`;
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/catering" label="Catering" />
      <h1 className="font-display text-2xl font-bold">Bookings</h1>
      <div className="flex gap-2">
        <Link href="/dashboard/catering/bookings" className={tab(!showPast)}>
          Upcoming
        </Link>
        <Link href="/dashboard/catering/bookings?past=1" className={tab(showPast)}>
          Past
        </Link>
      </div>
      {bookings.length === 0 ? (
        <p className="text-muted text-sm">
          {showPast ? "No past events yet." : "No upcoming events yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b) => {
            const pkg = (b.quote as { packageName?: string } | null)?.packageName;
            const paid =
              b.status === "paid_in_full" || b.status === "completed"
                ? b.total_cents
                : b.total_cents - b.balance_cents;
            return (
              <li key={b.id}>
                <Link
                  href={`/dashboard/catering/bookings/${b.id}`}
                  className="border-line bg-surface active:bg-background flex min-h-12 flex-col gap-1 rounded-2xl border p-4"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium">
                      {formatShortDate(b.event_date)} · {b.host_name}
                    </span>
                    <span className="text-muted text-xs font-medium">
                      {bookingStatusLabel(b.status)}
                    </span>
                  </span>
                  <span className="text-muted text-sm">
                    {b.guest_count} guests{pkg ? ` · ${pkg}` : ""} · {formatCents(b.total_cents)}
                    {["confirmed", "balance_due", "paid_in_full", "completed"].includes(b.status) &&
                      ` · ${formatCents(paid)} paid`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
