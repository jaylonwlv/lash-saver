import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { formatEventDate, todayIn } from "@/lib/catering/dates";
import { createClient, getUser } from "@/lib/supabase/server";
import { unblockDate } from "../actions";
import { BlockForm } from "./block-form";

export const metadata: Metadata = { title: "Blocked dates" };

export default async function BlockedDatesPage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();
  const today = todayIn(profile?.timezone ?? "America/Los_Angeles");
  const { data: dates, error } = await supabase
    .from("catering_blocked_dates")
    .select("date, reason")
    .eq("tech_id", user!.id)
    .gte("date", today)
    .order("date");
  if (error) throw new Error(`Loading blocked dates failed: ${error.message}`);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/catering" label="Catering" />
      <h1 className="font-display text-2xl font-bold">Blocked dates</h1>
      <p className="text-muted text-sm">
        Hosts can&apos;t pick these dates. Dates you&apos;re already booked are blocked for you.
      </p>
      <BlockForm min={today} />
      {dates.length > 0 && (
        <ul className="flex flex-col gap-3">
          {dates.map((d) => (
            <li
              key={d.date}
              className="border-line bg-surface flex items-center justify-between gap-3 rounded-2xl border p-4"
            >
              <span className="flex flex-col">
                <span className="font-medium">{formatEventDate(d.date)}</span>
                {d.reason && <span className="text-muted text-sm">{d.reason}</span>}
              </span>
              <form action={unblockDate.bind(null, d.date)}>
                <button type="submit" className="text-brand min-h-12 px-2 text-sm font-medium">
                  Unblock
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
