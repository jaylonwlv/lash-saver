import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { LegalLinks } from "@/components/ui/legal-links";
import { ProInvite } from "@/components/ui/pro-invite";
import { accentStyle } from "@/lib/accents";
import { REMINDER_OFFSETS_HOURS } from "@/lib/config";
import { policySummary } from "@/lib/appointments";
import { publicEnv } from "@/lib/env.public";
import { formatDuration } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { inviteUrl } from "@/lib/referral";
import { loadMenu } from "./menu";
import { RevealOnScroll } from "./reveal";

/*
 * A pro's own page at getdibs.pro/<slug>, for their Instagram bio: services,
 * prices and policy, then "message me to book". It doesn't book or take
 * deposits (that's the pay link). Client-facing: light body, trade-neutral, no
 * trackers, no photos to upload: the type, the pro's color and motion carry it.
 */

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

const dollars = (cents: number) => formatCents(cents).replace(/\.00$/, "");
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

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
  const handle = tech.instagram_handle;
  const dm = handle ? `https://ig.me/m/${handle}` : null;
  const hours = tech.cancellation_window_hours ?? 0;
  const lines = splitName(name);
  const lowestDeposit = services.length ? Math.min(...services.map((s) => s.deposit_cents)) : 0;

  return (
    <div
      className={`flex flex-1 flex-col ${dm ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))]" : ""}`}
      style={accentStyle(tech.accent_color)}
    >
      <RevealOnScroll />

      {/* Hero: the name, big, with the pro's color drifting behind it. */}
      <header
        data-hero
        className="bg-ink relative isolate flex min-h-[88svh] flex-col overflow-hidden px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 text-white"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="drift bg-pink/45 absolute -top-[20%] -right-[35%] size-[min(120vw,720px)] rounded-full blur-[90px]" />
          <div
            className="drift bg-pink/20 absolute -bottom-[25%] -left-[40%] size-[min(110vw,640px)] rounded-full blur-[100px]"
            style={{ animationDelay: "-9s" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(transparent_0,rgb(0_0_0/0.45)_100%)]" />
        </div>

        <div className="mx-auto flex w-full max-w-xl items-center justify-between text-[11px] font-semibold tracking-[0.28em] text-white/60 uppercase">
          <span className="soft-in" style={delay(100)}>
            By appointment
          </span>
          {handle && (
            <a
              href={`https://instagram.com/${handle}`}
              className="soft-in hover:text-pink inline-flex min-h-11 items-center tracking-[0.08em] normal-case"
              style={delay(200)}
            >
              @{handle}
            </a>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-end gap-7 pt-16">
          <p
            className="soft-in text-pink text-xs font-semibold tracking-[0.3em] uppercase"
            style={delay(250)}
          >
            Services &amp; booking
          </p>
          <h1
            className={`${serif.className} text-[clamp(3.6rem,17vw,7rem)] leading-[0.92] tracking-[-0.02em] break-words`}
          >
            {lines.map((line, i) => (
              <span key={i} className="mask-line">
                <span
                  className={i === lines.length - 1 && lines.length > 1 ? "italic" : undefined}
                  style={delay(350 + i * 140)}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <span
            aria-hidden
            className="draw-x bg-pink block h-px w-full opacity-70"
            style={delay(700)}
          />
          <div className="soft-in flex flex-col gap-5" style={delay(850)}>
            <p className="max-w-sm text-lg leading-snug text-white/75">
              {services.length > 0
                ? `${services.length} service${services.length === 1 ? "" : "s"}, from ${dollars(services[0].price_cents)}. A deposit holds your spot.`
                : "Booking by message. A deposit holds your spot."}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {dm && (
                <a
                  href={dm}
                  className="press bg-pink text-ink inline-flex min-h-13 items-center rounded-full px-7 text-base font-bold"
                >
                  Message to book
                </a>
              )}
              <a
                href="#menu"
                className="inline-flex min-h-13 items-center rounded-full px-5 text-base font-semibold text-white ring-1 ring-white/30"
              >
                See the menu
              </a>
            </div>
          </div>
        </div>
        <span
          aria-hidden
          className="soft-in mx-auto mt-8 flex flex-col items-center gap-1 text-[10px] tracking-[0.3em] text-white/45 uppercase"
          style={delay(1200)}
        >
          Scroll
          <span className="nudge block h-6 w-px bg-white/50" />
        </span>
      </header>

      {/* Service names gliding by, in the pro's color. */}
      {services.length > 0 && (
        <Marquee items={services.map((s) => s.name)} font={serif.className} />
      )}

      <main className="flex flex-1 flex-col">
        {/* The menu: numbered, hairline-ruled, like a printed price list. */}
        <section id="menu" className="mx-auto w-full max-w-xl scroll-mt-4 px-6 pt-16 pb-6">
          <Eyebrow>The menu</Eyebrow>
          <h2 data-reveal className={`${serif.className} mt-3 text-5xl leading-none`}>
            Services <span className="italic">&amp;</span> prices
          </h2>
          {services.length === 0 ? (
            <p data-reveal className="text-muted mt-8 text-lg">
              Services and prices are coming soon. Message to ask about booking.
            </p>
          ) : (
            <ol className="mt-10 flex flex-col">
              {services.map((s, i) => (
                <li
                  key={s.id}
                  data-reveal
                  style={delay(Math.min(i, 4) * 90)}
                  className="border-line flex items-baseline gap-4 border-t py-6 last:border-b"
                >
                  <span className="text-brand w-7 shrink-0 text-xs font-semibold tracking-[0.15em] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className={`${serif.className} text-[1.9rem] leading-[1.05] break-words`}>
                      {s.name}
                    </span>
                    <span className="text-muted text-xs font-medium tracking-[0.14em] uppercase">
                      {formatDuration(s.duration_minutes)} · {dollars(s.deposit_cents)} deposit
                    </span>
                  </div>
                  <span className={`${serif.className} shrink-0 text-[1.9rem] leading-none`}>
                    {dollars(s.price_cents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* The numbers that matter, big. */}
        {services.length > 0 && (
          <section className="mx-auto grid w-full max-w-xl grid-cols-2 gap-x-6 gap-y-10 px-6 py-14">
            <Stat
              value={dollars(services[0].price_cents)}
              label="Starting price"
              font={serif.className}
              i={0}
            />
            <Stat
              value={dollars(lowestDeposit)}
              label="Deposit to hold your spot"
              font={serif.className}
              i={1}
            />
            <Stat
              value={hours > 0 ? `${hours}h` : "Any time"}
              label={
                hours > 0
                  ? "Notice to cancel with a refund"
                  : "Cancel before it starts for a refund"
              }
              font={serif.className}
              i={2}
            />
            <Stat
              value={String(REMINDER_OFFSETS_HOURS.length)}
              label={`Reminders, ${REMINDER_OFFSETS_HOURS.join("h and ")}h before`}
              font={serif.className}
              i={3}
            />
          </section>
        )}

        {/* How booking works, as a dark band. */}
        <section className="bg-ink relative overflow-hidden px-6 py-20 text-white">
          <div
            aria-hidden
            className="bg-pink/25 pointer-events-none absolute -right-1/3 -bottom-1/3 size-[min(90vw,560px)] rounded-full blur-[90px]"
          />
          <div className="relative mx-auto flex w-full max-w-xl flex-col gap-12">
            <div>
              <Eyebrow light>How booking works</Eyebrow>
              <h2 data-reveal className={`${serif.className} mt-3 text-5xl leading-[1.02]`}>
                Three steps, <span className="text-pink italic">no back-and-forth.</span>
              </h2>
            </div>
            <ol className="flex flex-col gap-10">
              {[
                [
                  "Message to pick a time",
                  handle
                    ? `DM @${handle} with the day you want.`
                    : "Send a message with the day you want.",
                ],
                [
                  "Pay the deposit",
                  "You get a private link to agree to the policy and pay. It goes toward your appointment.",
                ],
                [
                  "You're booked",
                  "Your spot is held for you, with a confirmation, a calendar invite and reminders.",
                ],
              ].map(([title, detail], i) => (
                <li key={title} data-reveal style={delay(i * 120)} className="flex gap-5">
                  <span
                    className={`${serif.className} text-pink w-12 shrink-0 text-6xl leading-[0.8] italic`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex flex-col gap-1.5 border-t border-white/15 pt-3">
                    <span className="text-lg font-semibold">{title}</span>
                    <span className="leading-relaxed text-white/65">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The policy, plainly. */}
        <section className="mx-auto w-full max-w-xl px-6 pt-16 pb-4">
          <Eyebrow>The policy</Eyebrow>
          <h2 data-reveal className={`${serif.className} mt-3 text-5xl leading-[1.02]`}>
            Fair for <span className="italic">everyone.</span>
          </h2>
          <ol data-reveal className="mt-8 flex flex-col gap-0" style={delay(100)}>
            <li className="relative flex gap-4 pb-6">
              <span className="bg-success mt-1.5 size-3 shrink-0 rounded-full" />
              <span aria-hidden className="bg-line absolute top-5 bottom-0 left-[5px] w-px" />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">
                  {hours > 0 ? `Until ${hours} hours before` : "Until your appointment starts"}
                </span>
                <span className="text-muted">Cancel and get your deposit back.</span>
              </span>
            </li>
            <li className="flex gap-4">
              <span className="bg-brand mt-1.5 size-3 shrink-0 rounded-full" />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">After that, or a no-show</span>
                <span className="text-muted">The deposit is kept.</span>
              </span>
            </li>
          </ol>
          <p
            data-reveal
            className="border-line text-muted mt-8 border-t pt-6 leading-relaxed whitespace-pre-line"
          >
            {policySummary(hours, tech.policy_text)}
          </p>
        </section>

        {/* Last word: book. */}
        <section className="mx-auto flex w-full max-w-xl flex-col items-start gap-6 px-6 pt-14 pb-12">
          <h2
            data-reveal
            className={`${serif.className} text-[clamp(3rem,14vw,5.5rem)] leading-[0.95]`}
          >
            Your spot is <span className="text-brand italic">waiting.</span>
          </h2>
          {dm ? (
            <a
              data-reveal
              href={dm}
              style={delay(120)}
              className="press bg-ink inline-flex min-h-13 items-center rounded-full px-7 font-bold text-white"
            >
              Message @{handle}
            </a>
          ) : (
            <p data-reveal className="text-muted text-lg">
              Send {name} a message to book.
            </p>
          )}
        </section>

        <div className="mx-auto flex w-full max-w-xl flex-col gap-2 px-6 pb-6">
          <ProInvite compact href={inviteUrl(publicEnv().NEXT_PUBLIC_APP_URL, slug, "menu")} />
          <LegalLinks />
        </div>
      </main>

      {/* Booking always starts in the DMs: keep that one tap away while scrolling. */}
      {dm && (
        <div
          data-sticky-cta
          className="bg-background/85 border-line fixed inset-x-0 bottom-0 z-10 border-t px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-500"
        >
          <a
            href={dm}
            className="press bg-brand text-brand-foreground mx-auto flex min-h-13 w-full max-w-xl items-center justify-center rounded-full text-base font-bold shadow-[0_10px_24px_-12px_var(--brand)]"
          >
            Message to book
          </a>
        </div>
      )}
    </div>
  );
}

/** Up to three balanced lines for the hero name ("Studio Nova" → Studio / Nova). */
function splitName(name: string): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [name.trim()];
  if (words.length <= 3) return words;
  const per = Math.ceil(words.length / 3);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += per) lines.push(words.slice(i, i + per).join(" "));
  return lines;
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p
      data-reveal
      className={`flex items-center gap-3 text-[11px] font-semibold tracking-[0.3em] uppercase ${
        light ? "text-white/60" : "text-muted"
      }`}
    >
      <span aria-hidden className={`h-px w-8 ${light ? "bg-pink" : "bg-brand"}`} />
      {children}
    </p>
  );
}

function Stat({
  value,
  label,
  font,
  i,
}: {
  value: string;
  label: string;
  font: string;
  i: number;
}) {
  return (
    <div
      data-reveal
      style={delay(i * 100)}
      className="border-line flex flex-col gap-2 border-t pt-4"
    >
      <span className={`${font} text-5xl leading-none`}>{value}</span>
      <span className="text-muted text-xs leading-snug font-medium tracking-[0.12em] uppercase">
        {label}
      </span>
    </div>
  );
}

function Marquee({ items, font }: { items: string[]; font: string }) {
  // Enough copies to fill a wide screen; the track is doubled so the loop is seamless.
  const base = Array.from({ length: Math.max(1, Math.ceil(8 / items.length)) }, () => items).flat();
  const track = [...base, ...base];
  return (
    <div aria-hidden className="bg-brand text-brand-foreground overflow-hidden py-4">
      <div
        className="marquee flex w-max items-center gap-6 whitespace-nowrap"
        style={{ "--marquee": `${Math.max(24, base.length * 5)}s` } as CSSProperties}
      >
        {track.map((item, i) => (
          <span key={i} className="flex items-center gap-6">
            <span className={`${font} text-3xl italic`}>{item}</span>
            <span className="text-sm opacity-70">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
