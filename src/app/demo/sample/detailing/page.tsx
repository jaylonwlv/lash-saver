import type { Metadata } from "next";
import { SamplePro } from "../sample-pro";

/* The sample page on /detailers: a made-up detailer. Nothing here is real or bookable. */

export const metadata: Metadata = { title: "Sample page", robots: { index: false } };

const SERVICES = [
  {
    id: "d1",
    name: "Maintenance wash",
    duration_minutes: 60,
    price_cents: 8000,
    deposit_cents: 2000,
  },
  { id: "d2", name: "Wash & wax", duration_minutes: 120, price_cents: 12000, deposit_cents: 2500 },
  {
    id: "d3",
    name: "Interior detail",
    duration_minutes: 150,
    price_cents: 18000,
    deposit_cents: 4000,
  },
  { id: "d4", name: "Full detail", duration_minutes: 240, price_cents: 30000, deposit_cents: 6000 },
];

export default async function DetailingSamplePage({
  searchParams,
}: PageProps<"/demo/sample/detailing">) {
  return (
    <SamplePro
      look={await searchParams}
      name="Northside Detail"
      services={SERVICES}
      cancellationHours={24}
      policyText={
        "Cancel or reschedule at least 24 hours before your appointment to get your deposit back. Later cancellations and no-shows lose the deposit.\n\nPlease make sure I can get to your vehicle at the appointment time."
      }
      fallbackStyle="performance"
    />
  );
}
