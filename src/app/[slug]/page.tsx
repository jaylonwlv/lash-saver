import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { PolicyCard } from "@/app/pay/[id]/ui";
import { LegalLinks } from "@/components/ui/legal-links";
import { ProInvite } from "@/components/ui/pro-invite";
import { accentStyle } from "@/lib/accents";
import { policySummary } from "@/lib/appointments";
import { publicEnv } from "@/lib/env.public";
import { formatDuration } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { inviteUrl } from "@/lib/referral";
import { loadMenu } from "./menu";

/*
 * A pro's menu page at getdibs.pro/<slug>, for their Instagram bio: services,
 * prices and policy, then "message me to book". It doesn't book or take
 * deposits (that's the pay link). Client-facing: light, trade-neutral, no trackers.
 */

const dollars = (cents: number) => formatCents(cents).replace(/\.00$/, "");

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const menu = await loadMenu((await params).slug);
  if (!menu) return { title: "Page not found" };
  const from = menu.services[0] ? ` From ${dollars(menu.services[0].price_cents)}.` : "";
  return {
    title: { absolute: `${menu.name} · Services & prices` },
    description: `See ${menu.name}'s services, prices and booking policy.${from} Message to book.`,
  };
}

export default async function MenuPage({ params }: PageProps<"/[slug]">) {
  const menu = await loadMenu((await params).slug);
  if (!menu) notFound();
  const { tech, services, name, slug } = menu;
  const dm = tech.instagram_handle ? `https://ig.me/m/${tech.instagram_handle}` : null;
  const hours = tech.cancellation_window_hours ?? 0;

  return (
    <div
      // Room for the sticky "Message to book" bar, when there is one.
      className={`flex flex-1 flex-col ${dm ? "pb-[calc(6rem+env(safe-area-inset-bottom))]" : "pb-8"}`}
      style={accentStyle(tech.accent_color)}
    >
      {/* The pro's name, big: this is their page. */}
      <header className="bg-ink relative overflow-hidden px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8 text-white">
        <div
          aria-hidden
          className="bg-pink/35 pointer-events-none absolute -top-24 -right-16 size-72 rounded-full blur-3xl"
        />
        <div className="relative mx-auto flex w-full max-w-md flex-col items-start gap-4">
          <span
            aria-hidden
            className="pop bg-pink text-ink font-display flex size-16 items-center justify-center rounded-[22px] text-3xl font-extrabold"
          >
            {name.trim().charAt(0).toUpperCase() || "•"}
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[38px] leading-[1] font-extrabold tracking-[-0.03em] break-words">
              {name}
            </h1>
            <p className="text-white/70">Services, prices and how to book</p>
          </div>
          {dm && (
            <a
              href={dm}
              className="press bg-pink text-ink inline-flex min-h-12 items-center gap-2 rounded-full px-5 font-bold"
            >
              Message @{tech.instagram_handle}
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pt-7">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-extrabold tracking-tight">Menu</h2>
          {services.length === 0 ? (
            <p className="text-muted bg-surface rounded-[22px] p-5 shadow-[0_0_0_1px_var(--line)]">
              Services and prices are coming soon. Message to ask about booking.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {services.map((s, i) => (
                <li
                  key={s.id}
                  style={{ "--i": i } as CSSProperties}
                  className="rise bg-surface flex items-center justify-between gap-4 rounded-[22px] p-4 shadow-[0_0_0_1px_var(--line),0_8px_24px_-14px_rgb(120_40_70_/_0.25)]"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-display text-lg leading-tight font-extrabold break-words">
                      {s.name}
                    </span>
                    <span className="text-muted text-sm">
                      {formatDuration(s.duration_minutes)} · {dollars(s.deposit_cents)} deposit to
                      book
                    </span>
                  </div>
                  <span className="font-display shrink-0 text-2xl font-extrabold">
                    {dollars(s.price_cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-extrabold tracking-tight">How booking works</h2>
          <ol className="flex flex-col gap-2">
            {[
              [
                "Message to pick a time",
                dm
                  ? `DM @${tech.instagram_handle} with the day you want.`
                  : "Send a message with the day you want.",
              ],
              [
                "Pay the deposit",
                "You'll get a link to agree to the policy and pay. It goes toward your appointment.",
              ],
              ["You're booked", "Your spot is locked in, with reminders before your appointment."],
            ].map(([title, detail], i) => (
              <li
                key={title}
                className="bg-surface flex gap-3 rounded-[20px] p-4 shadow-[0_0_0_1px_var(--line)]"
              >
                <span className="bg-brand-soft text-brand font-display flex size-9 shrink-0 items-center justify-center rounded-xl font-extrabold">
                  {i + 1}
                </span>
                <span className="flex flex-col">
                  <span className="font-bold">{title}</span>
                  <span className="text-muted text-sm">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <PolicyCard
          refundBy={
            hours > 0 ? `${hours} hours before your appointment` : "your appointment starts"
          }
          policy={policySummary(hours, tech.policy_text)}
        />

        <ProInvite compact href={inviteUrl(publicEnv().NEXT_PUBLIC_APP_URL, slug, "menu")} />
        <LegalLinks className="mt-auto pt-2" />
      </main>

      {/* Booking always starts in the DMs: keep that one tap away while scrolling. */}
      {dm && (
        <div className="bg-background/90 border-line fixed inset-x-0 bottom-0 border-t px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <a
            href={dm}
            className="press bg-brand text-brand-foreground mx-auto flex min-h-14 w-full max-w-md items-center justify-center rounded-2xl text-lg font-extrabold shadow-[0_8px_20px_-10px_var(--brand)]"
          >
            Message to book
          </a>
        </div>
      )}
    </div>
  );
}
