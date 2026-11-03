import type { CSSProperties, ReactNode } from "react";
import { LegalLinks } from "@/components/ui/legal-links";
import { ProInvite } from "@/components/ui/pro-invite";
import { accentStyle } from "@/lib/accents";
import { policySummary } from "@/lib/appointments";
import { REMINDER_OFFSETS_HOURS } from "@/lib/config";
import { formatDuration } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { pageStyleFor } from "@/lib/page-styles";
import { LOOKS, type Look } from "./looks";
import { RevealOnScroll } from "./reveal";

/*
 * A pro's own page (getdibs.pro/<slug>), shared by the public route and the live
 * preview in the dashboard. Photo-free: the type (page style), the pro's color
 * and motion carry it. Client-facing: trade-neutral, no trackers. It doesn't
 * book or take deposits; booking starts with a message.
 */

export type ProPageService = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  deposit_cents: number;
};

export type ProPageProps = {
  name: string;
  handle: string | null;
  services: ProPageService[];
  cancellationHours: number;
  policyText: string | null;
  accent: string | null;
  style: string | null;
  /** "Try Dibs free" link; left out of the preview. */
  inviteHref: string | null;
  /** In the dashboard preview, links open outside it. */
  preview?: boolean;
  /** Photos of their work (optional): a moving gallery under the hero. */
  photos?: { id: string; url: string; width: number; height: number }[];
};

const dollars = (cents: number) => formatCents(cents).replace(/\.00$/, "");
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function ProPage({
  name,
  handle,
  services,
  cancellationHours: hours,
  policyText,
  accent,
  style,
  inviteHref,
  preview = false,
  photos = [],
}: ProPageProps) {
  const look = LOOKS[pageStyleFor(style)];
  const dm = handle ? `https://ig.me/m/${handle}` : null;
  const out = preview ? ({ target: "_blank", rel: "noreferrer" } as const) : {};
  const lines = splitName(name);
  const sorted = [...services].sort((a, b) => a.price_cents - b.price_cents);
  const lowestDeposit = sorted.length ? Math.min(...sorted.map((s) => s.deposit_cents)) : 0;

  return (
    <div
      className={`flex flex-1 flex-col ${dm ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))]" : ""}`}
      style={accentStyle(accent)}
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
              {...out}
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
          <h1 className={`${look.display} ${look.hero} break-words`}>
            {lines.map((line, i) => (
              <span key={i} className="mask-line">
                <span
                  className={
                    i === lines.length - 1 && lines.length > 1 ? look.heroLastLine : undefined
                  }
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
              {sorted.length > 0
                ? `${sorted.length} service${sorted.length === 1 ? "" : "s"}, from ${dollars(sorted[0].price_cents)}. A deposit holds your spot.`
                : "Booking by message. A deposit holds your spot."}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {dm && (
                <a
                  href={dm}
                  {...out}
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
      {sorted.length > 0 && <Marquee items={sorted.map((s) => s.name)} look={look} />}

      {/* Their work, gliding by in one row. */}
      {photos.length > 0 && (
        <section aria-label="Photos of the work" className="pt-14">
          <div className="mx-auto w-full max-w-xl px-6">
            <Eyebrow>The work</Eyebrow>
            <h2 data-reveal className={`${look.display} ${look.h2} mt-3`}>
              See it <span className={look.em}>for yourself.</span>
            </h2>
          </div>
          <div data-reveal className="mt-8" style={delay(120)}>
            <PhotoRow photos={photos} />
          </div>
        </section>
      )}

      <main className="flex flex-1 flex-col">
        {/* The menu: numbered, hairline-ruled, like a printed price list. */}
        <section id="menu" className="mx-auto w-full max-w-xl scroll-mt-4 px-6 pt-16 pb-6">
          <Eyebrow>The menu</Eyebrow>
          <h2 data-reveal className={`${look.display} ${look.h2} mt-3`}>
            Services <span className={look.em}>&amp;</span> prices
          </h2>
          {sorted.length === 0 ? (
            <p data-reveal className="text-muted mt-8 text-lg">
              Services and prices are coming soon. Message to ask about booking.
            </p>
          ) : (
            <ol className="mt-10 flex flex-col">
              {sorted.map((s, i) => (
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
                    <span className={`${look.display} ${look.item} break-words`}>{s.name}</span>
                    <span className="text-muted text-xs font-medium tracking-[0.14em] uppercase">
                      {formatDuration(s.duration_minutes)} · {dollars(s.deposit_cents)} deposit
                    </span>
                  </div>
                  <span className={`${look.display} ${look.price} shrink-0`}>
                    {dollars(s.price_cents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* The numbers that matter, big. */}
        {sorted.length > 0 && (
          <section className="mx-auto grid w-full max-w-xl grid-cols-2 gap-x-6 gap-y-10 px-6 py-14">
            <Stat value={dollars(sorted[0].price_cents)} label="Starting price" look={look} i={0} />
            <Stat
              value={dollars(lowestDeposit)}
              label="Deposit to hold your spot"
              look={look}
              i={1}
            />
            <Stat
              value={hours > 0 ? `${hours}h` : "Any time"}
              label={
                hours > 0
                  ? "Notice to cancel with a refund"
                  : "Cancel before it starts for a refund"
              }
              look={look}
              i={2}
            />
            <Stat
              value={String(REMINDER_OFFSETS_HOURS.length)}
              label={`Reminders, ${REMINDER_OFFSETS_HOURS.join("h and ")}h before`}
              look={look}
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
              <h2 data-reveal className={`${look.display} ${look.h2} mt-3`}>
                Three steps, <span className={look.emDark}>no back-and-forth.</span>
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
                  <span className={`${look.display} ${look.step} text-pink w-12 shrink-0`}>
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
          <h2 data-reveal className={`${look.display} ${look.h2} mt-3`}>
            Fair for <span className={look.em}>everyone.</span>
          </h2>
          <ol data-reveal className="mt-8 flex flex-col" style={delay(100)}>
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
              <span className="bg-foreground mt-1.5 size-3 shrink-0 rounded-full" />
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
            {policySummary(hours, policyText)}
          </p>
        </section>

        {/* Last word: book. */}
        <section className="mx-auto flex w-full max-w-xl flex-col items-start gap-6 px-6 pt-14 pb-12">
          <h2 data-reveal className={`${look.display} ${look.closing}`}>
            Your spot is <span className={look.em}>waiting.</span>
          </h2>
          {dm ? (
            <a
              data-reveal
              href={dm}
              {...out}
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
          {inviteHref && <ProInvite compact href={inviteHref} />}
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
            {...out}
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
export function splitName(name: string): string[] {
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

function Stat({ value, label, look, i }: { value: string; label: string; look: Look; i: number }) {
  return (
    <div
      data-reveal
      style={delay(i * 100)}
      className="border-line flex flex-col gap-2 border-t pt-4"
    >
      <span className={`${look.display} ${look.stat}`}>{value}</span>
      <span className="text-muted text-xs leading-snug font-medium tracking-[0.12em] uppercase">
        {label}
      </span>
    </div>
  );
}

function Marquee({ items, look }: { items: string[]; look: Look }) {
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
            <span className={`${look.display} ${look.marquee}`}>{item}</span>
            <span className="text-sm opacity-70">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * One gliding row of photos. Repeated to fill a wide screen and doubled for a
 * seamless loop; it pauses while touched or hovered. With reduced motion it's a
 * plain row you swipe through.
 */
function PhotoRow({
  photos,
}: {
  photos: { id: string; url: string; width: number; height: number }[];
}) {
  const base = Array.from(
    { length: Math.max(1, Math.ceil(6 / photos.length)) },
    () => photos,
  ).flat();
  return (
    <div className="group overflow-hidden motion-reduce:overflow-x-auto">
      <div
        className="marquee flex w-max gap-3 group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused]"
        style={{ "--marquee": `${Math.max(30, base.length * 7)}s` } as CSSProperties}
      >
        {[...base, ...base].map((photo, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- sized on upload, served from storage
          <img
            key={`${photo.id}-${i}`}
            src={photo.url}
            alt={i < photos.length ? "Photo of the work" : ""}
            aria-hidden={i >= photos.length || undefined}
            width={photo.width}
            height={photo.height}
            loading={i < 4 ? "eager" : "lazy"}
            decoding="async"
            className={`aspect-square h-80 w-auto rounded-[22px] object-cover shadow-[0_10px_30px_-18px_rgb(0_0_0/0.45)] sm:h-96 ${
              i >= base.length ? "motion-reduce:hidden" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}
