import type { Metadata } from "next";
import { SamplePro } from "./sample-pro";

/*
 * A sample pro page (the neutral "Studio Nova"), for the homepage's live phone.
 * Outside the (marketing) layout on purpose: no Pixel or Clarity inside the frame.
 * ?style= and ?accent= pick the look. Nothing here is real or bookable.
 */

export const metadata: Metadata = { title: "Sample page", robots: { index: false } };

const SERVICES = [
  { id: "s1", name: "Touch-up", duration_minutes: 45, price_cents: 5500, deposit_cents: 2000 },
  {
    id: "s2",
    name: "Express session",
    duration_minutes: 60,
    price_cents: 7500,
    deposit_cents: 2500,
  },
  {
    id: "s3",
    name: "Signature session",
    duration_minutes: 90,
    price_cents: 12000,
    deposit_cents: 4000,
  },
  {
    id: "s4",
    name: "The full works",
    duration_minutes: 150,
    price_cents: 18000,
    deposit_cents: 5000,
  },
];

export default async function SamplePage({ searchParams }: PageProps<"/demo/sample">) {
  return (
    <SamplePro
      look={await searchParams}
      name="Studio Nova"
      services={SERVICES}
      cancellationHours={48}
      policyText={
        "Cancel or reschedule at least 48 hours before your appointment to get your deposit back. Later cancellations and no-shows lose the deposit.\n\nRunning late? Message me. More than 15 minutes late may need to be rescheduled."
      }
      fallbackStyle="editorial"
    />
  );
}
