import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import heroDetailing from "../images/hero-detailing.png";
import { HeroStrike, Landing, type LandingNiche } from "../landing";

/*
 * The homepage for mobile detailers. proxy.ts shows it at "/" to visitors from the
 * Detailers ad set (lib/ad-sets.ts), so the ad's link never changes. Like /catering,
 * one of the marketing pages that names a trade on purpose.
 */

export const metadata: Metadata = {
  title: { absolute: `${APP_NAME} for mobile detailers: deposits that stop no-shows` },
  description:
    "Clients pay a deposit before you drive out. They agree to your policy, get reminders, and if nobody's there, you keep the deposit. Your Cash App, Zelle, Venmo or card.",
  openGraph: {
    title: "Stop driving to empty driveways",
    description:
      "Deposit links for mobile detailers who book in their DMs. No-show? You keep the deposit.",
    images: [heroDetailing.src],
  },
};

export const viewport: Viewport = { themeColor: "#0d0b0c" };

const DETAILERS: LandingNiche = {
  trade: "detailing",
  headline: (
    <>
      Stop driving to <HeroStrike>empty</HeroStrike> driveways.
    </>
  ),
  heroLine: "Deposit pay links for mobile detailers who book in their DMs. Your first one is free.",
  deposit: "$60",
  sampleName: "Northside Detail",
  flake: ["car's here!!", "actually it's at work"],
  clockLead: "Your 2:00 is in the driveway.",
  clockExcuses: ["car's here!!", "actually it's at work", "my husband has it"],
  costHeading: "A no-show costs more than the detail.",
  costBody:
    "It's the drive out and back, the gas, the half day you blocked, and the client you turned away for that slot. Most no-shows aren't personal: people forget, or nothing makes them feel committed. A paid deposit and a reminder fix both.",
  calculatorPrice: 200,
  samplePath: "/demo/sample/detailing",
  sampleAddress: `${new URL(publicEnv().NEXT_PUBLIC_APP_URL).host}/northside-detail`,
  styles: ["performance", "luxury", "professional", "bold", "clean", "editorial"],
  faq: [
    {
      q: "What if they're not home, or the car isn't there?",
      a: "That's a no-show under your policy, which they agreed to before paying. Tap No-show and you keep the deposit. Your policy can spell it out, for example that you need access to the vehicle at the appointment time.",
    },
    {
      q: "What about rain days?",
      a: "Cancel the appointment from your phone and their deposit goes back in full: automatically for card deposits, or you send it back on Cash App, Zelle or Venmo and tap I sent the refund. Then send them a pay link for the new day.",
    },
    {
      q: "Will clients really pay a deposit for a detail?",
      a: "The ones who plan to be there do: it goes toward the detail, and they get it back if they cancel in time. The ones who won't put down a deposit are usually the ones who would have left you in an empty driveway.",
    },
  ],
  finalHeading: "Your next empty driveway is already on your calendar.",
};

export default function DetailersPage() {
  return <Landing niche={DETAILERS} />;
}
