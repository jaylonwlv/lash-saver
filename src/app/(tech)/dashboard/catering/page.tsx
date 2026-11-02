import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { Button, ButtonLink } from "@/components/ui/button";
import { CopyLink } from "@/components/ui/copy-link";
import { bookingStatusLabel, HELD_STATUSES } from "@/lib/catering/bookings";
import { formatShortDate, todayIn } from "@/lib/catering/dates";
import { PUBLISH_PROBLEM_TEXT, publishProblems } from "@/lib/catering/setup";
import { cateringOpenForBookings } from "@/lib/catering/server";
import { zonedTimeToUtc } from "@/lib/time";
import { publicEnv } from "@/lib/env.public";
import { formatCents } from "@/lib/money";
import { createClient, getUser } from "@/lib/supabase/server";
import { setPublished, startCatering } from "./actions";

export const metadata: Metadata = { title: "Catering" };

export default async function CateringPage({ searchParams }: PageProps<"/dashboard/catering">) {
  const { published, publish, saved } = await searchParams;
  const user = await getUser();
  const supabase = await createClient();
  const [{ data: settings, error }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("catering_settings").select("is_published").eq("tech_id", user!.id).maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "slug, timezone, business_name, email, stripe_account_id, stripe_charges_enabled, subscription_status",
      )
      .eq("id", user!.id)
      .single(),
  ]);
  if (error || profileError || !profile)
    throw new Error(`Loading catering failed: ${(error ?? profileError)?.message}`);

  if (!settings) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink href="/dashboard" label="Dashboard" />
        <h1 className="font-display text-2xl font-bold">Catering quote page</h1>
        <p className="text-muted">
          One link for your bio: hosts pick a date, see your price for their guest count and pay a
          deposit to hold the date. You get an email when an event is booked.
        </p>
        <form action={startCatering}>
          <Button type="submit">Set up catering</Button>
        </form>
      </div>
    );
  }

  const today = todayIn(profile.timezone);
  const monthStart =
    zonedTimeToUtc(`${today.slice(0, 7)}-01`, "00:00", profile.timezone) ?? new Date();
  const [problems, upcomingRes, overdueRes, monthRes, open] = await Promise.all([
    publishProblems(supabase, user!.id),
    supabase
      .from("catering_bookings")
      .select("id, event_date, host_name, guest_count, status, balance_cents, balance_due_date")
      .gte("event_date", today)
      .in("status", [...HELD_STATUSES, "requested"])
      .order("event_date")
      .limit(5),
    supabase
      .from("catering_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "balance_due")
      .lt("balance_due_date", today),
    supabase
      .from("catering_payments")
      .select("kind, amount_cents")
      .eq("status", "paid")
      .gte("paid_at", monthStart.toISOString()),
    cateringOpenForBookings({ ...profile, id: user!.id }),
  ]);
  if (upcomingRes.error || monthRes.error)
    throw new Error(`Loading bookings failed: ${(upcomingRes.error ?? monthRes.error)?.message}`);
  const confirmedUpcoming = upcomingRes.data;
  const overdue = overdueRes.count ?? 0;
  const bookedThisMonth = monthRes.data.filter((p) => p.kind === "deposit").length;
  const collectedThisMonth = monthRes.data.reduce((sum, p) => sum + p.amount_cents, 0);

  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const pageUrl = profile.slug ? `${appUrl}/c/${profile.slug}` : null;

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard" label="Dashboard" />
      <h1 className="font-display text-2xl font-bold">Catering</h1>

      {saved === "1" && <p className="bg-brand-soft rounded-2xl p-4 text-sm">Saved.</p>}
      {published === "1" && (
        <p className="bg-brand-soft rounded-2xl p-4 text-sm">
          <strong>Your quote page is live.</strong> Put the link in your Instagram bio and send it
          when someone asks &ldquo;how much for…?&rdquo;
        </p>
      )}

      {settings.is_published && problems.length === 0 && !open && (
        <Link
          href="/dashboard/billing"
          className="border-danger bg-surface rounded-2xl border-2 p-4 text-sm"
        >
          <strong>Your page isn&apos;t taking bookings.</strong> Your first booking was free. Add
          your card to keep taking them (cancel anytime) →
        </Link>
      )}

      <section className="grid grid-cols-2 gap-3">
        <div className="bg-ink flex flex-col gap-1 rounded-2xl p-4 text-white">
          <span className="text-pink text-2xl font-bold">{bookedThisMonth}</span>
          <span className="text-xs text-white/70">Bookings this month</span>
        </div>
        <div className="bg-ink flex flex-col gap-1 rounded-2xl p-4 text-white">
          <span className="text-pink text-2xl font-bold">{formatCents(collectedThisMonth)}</span>
          <span className="text-xs text-white/70">Collected this month</span>
        </div>
      </section>

      <section className="border-line bg-surface flex flex-col gap-4 rounded-2xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Your quote page</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${settings.is_published ? "bg-brand-soft text-brand" : "bg-background text-muted"}`}
          >
            {settings.is_published ? "Live" : "Not published"}
          </span>
        </div>
        {settings.is_published && pageUrl ? (
          <>
            <CopyLink url={pageUrl} display={pageUrl.replace(/^https?:\/\//, "")} />
            <a
              href={pageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand text-sm font-medium"
            >
              Open it like a host would →
            </a>
            <form action={setPublished.bind(null, false)}>
              <button type="submit" className="text-muted text-sm underline">
                Unpublish
              </button>
            </form>
          </>
        ) : (
          <>
            {problems.length > 0 ? (
              <>
                <p className="text-muted text-sm">Before you publish:</p>
                <ul className="flex flex-col gap-2 text-sm">
                  {problems.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span aria-hidden>○</span>
                      <Link href={problemHref(p)} className="text-brand font-medium">
                        {PUBLISH_PROBLEM_TEXT[p]}
                      </Link>
                    </li>
                  ))}
                </ul>
                {publish === "blocked" && (
                  <p className="text-danger text-sm">Finish the steps above first.</p>
                )}
              </>
            ) : (
              <p className="text-muted text-sm">
                Everything&apos;s ready. Check your prices, then publish.
              </p>
            )}
            {pageUrl && (
              <a
                href={`${pageUrl}?preview=1`}
                target="_blank"
                rel="noreferrer"
                className="text-brand text-sm font-medium"
              >
                Preview your page →
              </a>
            )}
            <form action={setPublished.bind(null, true)}>
              <Button type="submit" disabled={problems.length > 0}>
                Publish my quote page
              </Button>
            </form>
          </>
        )}
      </section>

      <nav className="grid grid-cols-2 gap-3">
        <ButtonLink href="/dashboard/catering/packages" variant="secondary">
          Packages
        </ButtonLink>
        <ButtonLink href="/dashboard/catering/settings" variant="secondary">
          Pricing & rules
        </ButtonLink>
        <ButtonLink href="/dashboard/catering/dates" variant="secondary">
          Blocked dates
        </ButtonLink>
        <ButtonLink href="/dashboard/catering/bookings" variant="secondary">
          All bookings
        </ButtonLink>
      </nav>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">
          Coming up
          {overdue > 0 && (
            <span className="text-danger">
              {" "}
              · {overdue} balance{overdue === 1 ? "" : "s"} overdue
            </span>
          )}
        </h2>
        {confirmedUpcoming.length === 0 ? (
          <p className="text-muted text-sm">No events booked yet. They&apos;ll show up here.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {confirmedUpcoming.map((b) => (
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
                    {b.guest_count} guests
                    {b.balance_cents > 0 && b.status !== "paid_in_full"
                      ? ` · ${formatCents(b.balance_cents)} balance${b.balance_due_date ? ` due ${formatShortDate(b.balance_due_date)}` : ""}`
                      : " · Paid in full"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function problemHref(p: keyof typeof PUBLISH_PROBLEM_TEXT): string {
  if (p === "business") return "/dashboard/profile";
  if (p === "packages") return "/dashboard/catering/packages";
  return "/dashboard/payments";
}
