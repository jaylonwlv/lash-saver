import type { Metadata } from "next";
import { LegalLinks } from "@/components/ui/legal-links";
import { HELD_STATUSES } from "@/lib/catering/bookings";
import { bookableRange, dateState, todayIn } from "@/lib/catering/dates";
import { cateringOpenForBookings } from "@/lib/catering/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { QuoteForm } from "./quote-form";

type Params = PageProps<"/c/[slug]">;

async function load(slug: string) {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("public_profiles")
    .select("id, business_name, slug, instagram_handle, timezone")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Quote page: loading profile failed: ${error.message}`);
  if (!profile?.id) return null;
  // Published pages for everyone; the owner also sees their own unpublished page (preview).
  const { data: settings } = await supabase
    .from("catering_settings")
    .select("*")
    .eq("tech_id", profile.id)
    .maybeSingle();
  if (!settings) return null;
  return { supabase, profile: { ...profile, id: profile.id }, settings };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await load(slug);
  if (!loaded) return { title: "Page not available", robots: { index: false } };
  const name = loaded.profile.business_name ?? "Catering";
  const description = `Pick your date and guest count, see your price and hold the date with a deposit.${loaded.settings.cuisine ? ` ${loaded.settings.cuisine}.` : ""}`;
  return {
    title: `${name} catering: get a quote`,
    description,
    openGraph: { title: `Book ${name} for your event`, description },
  };
}

export default async function CateringQuotePage({ params }: Params) {
  const { slug } = await params;
  const loaded = await load(slug);
  if (!loaded) return <Unavailable />;
  const { supabase, profile, settings } = loaded;
  const businessName = profile.business_name ?? "Catering";

  const [packages, addOns] = await Promise.all([
    supabase
      .from("catering_packages")
      .select(
        "id, name, description, items_text, pricing_type, price_cents, min_guests, max_guests, included_minutes",
      )
      .eq("tech_id", profile.id)
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("catering_addons")
      .select("id, name, pricing_type, price_cents")
      .eq("tech_id", profile.id)
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at"),
  ]);
  if (packages.error || addOns.error)
    throw new Error(
      `Quote page: loading menu failed: ${(packages.error ?? addOns.error)?.message}`,
    );
  if (packages.data.length === 0) return <Unavailable />;

  // Which dates are taken: counts only, never who booked them.
  const admin = createAdminClient();
  const timezone = profile.timezone ?? "America/Los_Angeles";
  const today = todayIn(timezone);
  const { first, last } = bookableRange(today, settings);
  const nowIso = new Date().toISOString();
  const [{ data: blocked }, { data: held }, { data: owner }] = await Promise.all([
    admin
      .from("catering_blocked_dates")
      .select("date")
      .eq("tech_id", profile.id)
      .gte("date", first)
      .lte("date", last),
    admin
      .from("catering_bookings")
      .select("event_date, status, hold_expires_at")
      .eq("tech_id", profile.id)
      .gte("event_date", first)
      .lte("event_date", last)
      .in("status", [...HELD_STATUSES, "awaiting_deposit", "requested"]),
    admin
      .from("profiles")
      .select(
        "id, business_name, slug, email, timezone, stripe_account_id, stripe_charges_enabled, subscription_status",
      )
      .eq("id", profile.id)
      .single(),
  ]);
  const counts = new Map<string, number>();
  for (const b of held ?? []) {
    const holds =
      (HELD_STATUSES as readonly string[]).includes(b.status) || (b.hold_expires_at ?? "") > nowIso;
    if (holds) counts.set(b.event_date, (counts.get(b.event_date) ?? 0) + 1);
  }
  const blockedSet = new Set((blocked ?? []).map((d) => d.date));
  const unavailable = [...new Set([...blockedSet, ...counts.keys()])].filter(
    (d) => dateState(d, today, settings, blockedSet, counts) !== "ok",
  );

  const open = owner ? await cateringOpenForBookings(owner) : false;
  const preview = !settings.is_published;
  const notice = preview
    ? "Preview: this is how hosts see your page. Publish it to take bookings."
    : !open
      ? `${businessName} isn't taking online bookings right now. Message them to book.`
      : null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-ink px-5 pt-8 pb-6 text-white">
        <div className="mx-auto flex max-w-md flex-col gap-1">
          <p className="text-sm font-semibold text-white/70">
            {[settings.cuisine, settings.city].filter(Boolean).join(" · ") || "Catering"}
          </p>
          <h1 className="text-3xl font-bold">{businessName}</h1>
          {settings.description && <p className="text-sm text-white/80">{settings.description}</p>}
          <p className="mt-2 text-sm text-white/90">
            Get your price in a minute. Pay a deposit to hold your date.
          </p>
          {profile.instagram_handle && (
            <a
              href={`https://ig.me/m/${profile.instagram_handle}`}
              className="mt-1 text-sm text-white underline"
            >
              Questions? Message us
            </a>
          )}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-6">
        <QuoteForm
          slug={profile.slug ?? slug}
          businessName={businessName}
          packages={packages.data}
          addOns={addOns.data}
          rules={settings}
          first={first}
          last={last}
          today={today}
          unavailable={unavailable}
          balanceDueDaysBefore={settings.balance_due_days_before}
          policyText={settings.policy_text}
          canBook={!preview && open}
          notice={notice}
        />
        <LegalLinks />
      </main>
    </div>
  );
}

function Unavailable() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-5 py-16 text-center">
      <h1 className="text-2xl font-bold">This page isn&apos;t available</h1>
      <p className="text-muted">
        It may not be published yet. Message the business directly to ask about your event.
      </p>
    </main>
  );
}
