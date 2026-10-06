import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { policySummary } from "@/lib/appointments";
import { APP_NAME, TRIAL_DAYS } from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { getUser } from "@/lib/supabase/server";
import { OTHER_TRADE, TRADES } from "@/lib/trades";
import { StartFlow, type TradeOption } from "./start-flow";

export const metadata: Metadata = {
  title: `Start free for ${TRIAL_DAYS} days`,
  description: `Set up your deposit link in a minute. No card to sign up.`,
};
export const viewport: Viewport = { themeColor: "#0d0b0c" };

/** Matches the profiles.cancellation_window_hours default, used for "Something else". */
const DEFAULT_WINDOW_HOURS = 48;

/**
 * Instant sign-up: a new pro sets up their business and sees their own pay link
 * before giving an email, then saves it and is signed in straight away. Every
 * "Start free" button lands here.
 */
export default async function StartPage() {
  if (await getUser()) redirect("/dashboard");

  const trades: TradeOption[] = TRADES.map((t) => ({
    id: t.id,
    label: t.label,
    emoji: t.emoji,
    preview: t.services.map((s) => s.name).join(" · "),
    service: t.services[0]
      ? {
          name: t.services[0].name,
          priceCents: t.services[0].priceCents,
          depositCents: t.services[0].depositCents,
        }
      : null,
    policy: policySummary(t.windowHours, t.policyText),
  }));
  const other: TradeOption = {
    ...OTHER_TRADE,
    preview: "",
    service: null,
    policy: policySummary(DEFAULT_WINDOW_HOURS, null),
  };

  return (
    <div data-theme="dark" className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 pt-4">
        <Link href="/" className="inline-flex min-h-12 items-center gap-2 text-lg font-bold">
          <span className="bg-brand size-2.5 rounded-full" aria-hidden />
          {APP_NAME}
        </Link>
        <Link href="/login" className="text-brand inline-flex min-h-12 items-center font-medium">
          Sign in
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pt-2 pb-12">
        <StartFlow
          trades={trades}
          other={other}
          turnstileSiteKey={publicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        />
      </main>
    </div>
  );
}
