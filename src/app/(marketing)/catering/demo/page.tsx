import type { Metadata } from "next";
import Link from "next/link";
import { QuoteForm } from "@/app/c/[slug]/quote-form";
import { addDays, bookableRange, todayIn } from "@/lib/catering/dates";

// Dates move with today, so rebuild the page every hour.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sample catering quote page",
  robots: { index: false, follow: false },
};

// A made-up truck, so food truck owners can try the host's side. Nothing is booked.
const PACKAGES = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Taco bar",
    description: null,
    items_text: "Choice of 3 meats\nRice, beans and toppings\nPlates and napkins",
    pricing_type: "per_person" as const,
    price_cents: 1800,
    min_guests: 30,
    max_guests: 250,
    included_minutes: 120,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Truck rental",
    description: "Guests order from the full menu.",
    items_text: null,
    pricing_type: "flat" as const,
    price_cents: 150000,
    min_guests: 1,
    max_guests: null,
    included_minutes: 180,
  },
];
const ADD_ONS = [
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Horchata & aguas frescas",
    pricing_type: "per_person" as const,
    price_cents: 300,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Churro station",
    pricing_type: "flat" as const,
    price_cents: 25000,
  },
];
const RULES = {
  minimum_spend_cents: 80000,
  extra_hour_price_cents: 20000,
  max_extra_hours: 3,
  travel_fee_cents: 7500,
  service_fee_bps: 0,
  tax_bps: 775,
  deposit_type: "percent" as const,
  deposit_value: 3000,
};

export default function CateringDemoPage() {
  const today = todayIn("America/Los_Angeles");
  const bookingWindow = { min_notice_days: 7, max_advance_days: 365 };
  const { first, last } = bookableRange(today, bookingWindow);
  const unavailable = [10, 11, 17, 24].map((d) => addDays(first, d));

  return (
    <div className="flex flex-1 flex-col">
      <p className="bg-brand px-5 py-2 text-center text-sm font-semibold text-white">
        Sample page · nothing is booked or charged ·{" "}
        <Link href="/catering" className="underline">
          Get yours
        </Link>
      </p>
      <header className="bg-ink px-5 pt-8 pb-6 text-white">
        <div className="mx-auto flex max-w-md flex-col gap-1">
          <p className="text-sm font-semibold text-white/70">Birria tacos · San Diego</p>
          <h1 className="text-3xl font-bold">Sample Taco Truck</h1>
          <p className="mt-2 text-sm text-white/90">
            Get your price in a minute. Pay a deposit to hold your date.
          </p>
        </div>
      </header>
      <main
        data-theme="light"
        className="bg-background mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-6"
      >
        <QuoteForm
          slug="sample"
          businessName="Sample Taco Truck"
          packages={PACKAGES}
          addOns={ADD_ONS}
          rules={RULES}
          first={first}
          last={last}
          today={today}
          unavailable={unavailable}
          balanceDueDaysBefore={7}
          policyText="Your deposit holds your date and goes toward your event total. Final guest count is due 7 days before the event."
          canBook={false}
          notice="This is a sample. On your page, the host pays here and the date is theirs."
        />
      </main>
    </div>
  );
}
