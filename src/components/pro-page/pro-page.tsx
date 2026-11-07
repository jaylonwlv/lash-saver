import type { CSSProperties, ReactNode } from "react";
import { LegalLinks } from "@/components/ui/legal-links";
import { ProInvite } from "@/components/ui/pro-invite";
import { accentStyle } from "@/lib/accents";
import { policySummary } from "@/lib/appointments";
import { formatDuration } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { pageStyleFor } from "@/lib/page-styles";
import { proTagline, serviceMessage } from "@/lib/pro-page";
import { LOOKS } from "./looks";
import { RevealOnScroll } from "./reveal";
import { ServiceLink } from "./service-link";
import { WorkPhotos } from "./work-photos";

/*
 * A pro's own page (getdibs.pro/<slug>), shared by the public route and the live
 * preview in the dashboard. It answers what a client came for, in order: who is
 * this, is the work good, how much, how do I book. Their first photo fills the
 * hero, and the prices start on the first screen. The type (page style) and their
 * color carry it when there are no photos. Client-facing: no trackers, and any
 * trade named is in the pro's own words. It doesn't book or take deposits; booking
 * starts with a message.
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
  /** Photos of their work (optional): the first fills the hero, all of them swipe under the menu. */
  photos?: { id: string; url: string; width: number; height: number }[];
  /** The homepage's sample page: where "Message to book" goes instead of a real DM. */
  messageHref?: string;
  /** What they do, in their words ("Nail tech"). */
  specialty?: string | null;
  location?: string | null;
  /** A short note about them, beside their portrait. */
  about?: string | null;
  /** Kept current by the pro: "Booking for December". */
  status?: string | null;
  portraitUrl?: string | null;
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
  messageHref,
  specialty = null,
  location = null,
  about = null,
  status = null,
  portraitUrl = null,
}: ProPageProps) {
  const look = LOOKS[pageStyleFor(style)];
  const dm = messageHref ?? (handle ? `https://ig.me/m/${handle}` : null);
  const out = preview ? ({ target: "_blank", rel: "noreferrer" } as const) : {};
  const lines = splitName(name);
  const sorted = [...services].sort((a, b) => a.price_cents - b.price_cents);
  const tagline = proTagline(specialty, location);
  const cover = photos[0];

  return (
    <div
      className={`flex flex-1 flex-col ${dm ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))]" : ""}`}
      style={accentStyle(accent)}
    >
      <RevealOnScroll />

      {/* Hero: their work and their name, short enough that the prices start below it. */}
      <header
        data-hero
        className="bg-ink relative isolate flex min-h-[26rem] flex-col overflow-hidden px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-7 text-white"
      >
        {cover ? (
          <div aria-hidden className="absolute inset-0 -z-10">
            {/* eslint-disable-next-line @next/next/no-img-element -- sized on upload, served from storage */}
            <img
              src={cover.url}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/30" />
          </div>
        ) : (
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="drift bg-pink/45 absolute -top-[20%] -right-[35%] size-[min(120vw,720px)] rounded-full blur-[90px]" />
            <div className="drift bg-pink/20 absolute -bottom-[25%] -left-[40%] size-[min(110vw,640px)] rounded-full blur-[100px]" />
            <div className="absolute inset-0 bg-[radial-gradient(transparent_0,rgb(0_0_0/0.45)_100%)]" />
          </div>
        )}

        <div className="mx-auto flex min-h-11 w-full max-w-xl items-center justify-between text-[11px] font-semibold tracking-[0.28em] text-white/70 uppercase">
          <span>By appointment</span>
          {handle && (
            <a
              href={`https://instagram.com/${handle}`}
              {...out}
              className="hover:text-pink inline-flex min-h-11 items-center tracking-[0.08em] normal-case"
            >
              @{handle}
            </a>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-end gap-4 pt-8">
          {tagline && (
            <p className="text-sm font-semibold tracking-[0.04em] text-white/85">{tagline}</p>
          )}
          <h1 className={`${look.display} ${look.hero} break-words`}>
            {lines.map((line, i) => (
              <span key={i} className="mask-line">
                <span
                  className={
                    i === lines.length - 1 && lines.length > 1 ? look.heroLastLine : undefined
                  }
                  style={delay(i * 90)}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
          {status && (
            <p className="inline-flex items-center gap-2 self-start rounded-full bg-white/12 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
              <span aria-hidden className="bg-pink size-2 rounded-full" />
              {status}
            </p>
          )}
          <p className="max-w-sm leading-snug text-white/80">
            {sorted.length > 0
              ? `From ${dollars(sorted[0].price_cents)}. A deposit holds your spot.`
              : "Booking by message. A deposit holds your spot."}
          </p>
          {dm && (
            <a
              href={dm}
              {...out}
              className="press bg-pink text-ink inline-flex min-h-13 items-center justify-center self-start rounded-full px-7 text-base font-bold"
            >
              Message to book
            </a>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* The menu: numbered, hairline-ruled, like a printed price list. Prices never wait to appear. */}
        <section id="menu" className="mx-auto w-full max-w-xl scroll-mt-4 px-6 pt-8 pb-6">
          <h2 className={`${look.display} ${look.h2}`}>
            Services <span className={look.em}>&amp;</span> prices
          </h2>
          {sorted.length === 0 ? (
            <p data-reveal className="text-muted mt-6 text-lg">
              Services and prices are coming soon. Message to ask about booking.
            </p>
          ) : (
            <>
              {dm && (
                <p className="text-muted mt-2 text-sm">
                  Tap a service to message. We copy its name for you to paste.
                </p>
              )}
              <ol className="mt-5 flex flex-col">
                {sorted.map((s, i) => {
                  const row = (
                    <>
                      <span className="text-brand w-7 shrink-0 text-xs font-semibold tracking-[0.15em] tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className={`${look.display} ${look.item} break-words`}>{s.name}</span>
                        <span className="text-muted text-xs font-medium tracking-[0.14em] uppercase">
                          {formatDuration(s.duration_minutes)} · {dollars(s.deposit_cents)} deposit
                        </span>
                      </span>
                      <span className={`${look.display} ${look.price} shrink-0`}>
                        {dollars(s.price_cents)}
                      </span>
                    </>
                  );
                  return (
                    <li key={s.id} className="border-line border-t last:border-b">
                      {dm ? (
                        <ServiceLink
                          href={dm}
                          message={serviceMessage(s.name)}
                          label={`Message about ${s.name}, ${dollars(s.price_cents)}`}
                          newTab={preview}
                          className="press flex items-baseline gap-4 py-5"
                        >
                          {row}
                        </ServiceLink>
                      ) : (
                        <div className="flex items-baseline gap-4 py-5">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </section>

        {/* Their work, at the client's own pace. */}
        {photos.length > 0 && (
          <section aria-label="Photos of the work" className="pt-10">
            <div className="mx-auto w-full max-w-xl px-6">
              <Eyebrow>The work</Eyebrow>
              <h2 data-reveal className={`${look.display} ${look.h2} mt-3`}>
                See it <span className={look.em}>for yourself.</span>
              </h2>
            </div>
            <div className="mt-6">
              <WorkPhotos photos={photos} />
            </div>
          </section>
        )}

        {/* Who they'll be seeing. */}
        {(about || portraitUrl) && (
          <section
            aria-label={`About ${name}`}
            className="mx-auto flex w-full max-w-xl items-center gap-5 px-6 pt-12 pb-4"
          >
            {portraitUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- sized on upload, served from storage
              <img
                src={portraitUrl}
                alt={`Portrait of ${name}`}
                loading="lazy"
                decoding="async"
                className="size-24 shrink-0 rounded-full object-cover"
              />
            )}
            {about && <p className="text-lg leading-snug">{about}</p>}
          </section>
        )}

        {/* How booking works, as a dark band. */}
        <section className="bg-ink relative mt-10 overflow-hidden px-6 py-20 text-white">
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
