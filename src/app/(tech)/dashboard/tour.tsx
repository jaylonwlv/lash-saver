"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { APP_NAME } from "@/lib/config";

/*
 * First-run tour: how Dibs works in five short cards, then what's left before the
 * first booking, with a button straight to the next step. Shown once per phone to
 * pros who haven't sent a pay link yet; "Take the tour" (?tour=1) brings it back.
 */

const DONE_KEY = "dibs:tour-done-v1";
const LAUNCH_EVENT = "dibs:tour";

/** "Take the tour": reopens it from the first card. */
export function TourLauncher() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(LAUNCH_EVENT))}
      className="text-muted mx-auto inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold"
    >
      <span aria-hidden>✨</span> Take the 30-second tour
    </button>
  );
}

export type TourStep = { title: string; detail: string; href: string; done: boolean };

/** The pro's priciest service, so the value card speaks in their own numbers. */
export type TourExample = { service: string; price: string; deposit: string } | null;

const noSubscribe = () => () => {};
function seenSnapshot(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function Tour({
  steps,
  eligible,
  force,
  example,
}: {
  steps: TourStep[];
  example: TourExample;
  /** A pro who hasn't sent a pay link yet. */
  eligible: boolean;
  /** Opened from "Take the tour". */
  force: boolean;
}) {
  // Treated as seen until the page is running, so returning pros never see it flash.
  const seen = useSyncExternalStore(noSubscribe, seenSnapshot, () => true);
  const [closed, setClosed] = useState(false);
  // Reopened with "Take the tour" (TourLauncher), any number of times.
  const [launched, setLaunched] = useState(false);
  const [slide, setSlide] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const open = launched || (!closed && (force || (eligible && !seen)));

  useEffect(() => {
    const d = dialog.current;
    if (open && d && !d.open) d.showModal();
  }, [open]);

  useEffect(() => {
    const relaunch = () => {
      setSlide(0);
      setLaunched(true);
    };
    window.addEventListener(LAUNCH_EVENT, relaunch);
    return () => window.removeEventListener(LAUNCH_EVENT, relaunch);
  }, []);

  function close() {
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {
      // Storage blocked (private mode): it just shows again next time.
    }
    dialog.current?.close();
    setClosed(true);
    setLaunched(false);
    // Opened from "Take the tour": drop ?tour=1 so a refresh doesn't reopen it.
    if (force) window.history.replaceState(null, "", window.location.pathname);
  }

  if (!open) return null;

  const next = steps.find((s) => !s.done);
  const slides = SLIDES(steps, next, example);
  const last = slide === slides.length - 1;

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-labelledby="tour-title"
      className="backdrop:bg-ink/70 inset-x-0 top-auto bottom-0 m-0 h-auto max-h-[92dvh] w-full max-w-none bg-transparent p-0 backdrop:backdrop-blur-sm sm:inset-0 sm:m-auto sm:max-w-md"
    >
      <div className="bg-background flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[32px] pb-[env(safe-area-inset-bottom)] sm:rounded-[32px]">
        {/* Progress + skip */}
        <div className="flex items-center gap-3 px-5 pt-5">
          <div className="flex flex-1 gap-1.5" aria-hidden>
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= slide ? "bg-pink" : "bg-line"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={close}
            className="text-muted min-h-11 px-2 text-sm font-semibold"
          >
            {last ? "Close" : "Skip"}
          </button>
        </div>

        {/* Takes the dialog's initial focus, so no button starts out with a focus ring. */}
        <div
          key={slide}
          tabIndex={-1}
          autoFocus
          className="rise flex min-h-0 flex-col gap-5 overflow-y-auto px-6 pt-4 pb-2 outline-none [&>*]:shrink-0"
        >
          {slides[slide].visual}
          <div className="flex flex-col gap-2">
            <p className="text-brand text-xs font-bold tracking-[0.12em] uppercase">
              {slides[slide].eyebrow}
            </p>
            <h2
              id="tour-title"
              className="font-display text-[28px] leading-[1.05] font-extrabold tracking-tight"
            >
              {slides[slide].title}
            </h2>
            <div className="text-muted flex flex-col gap-2 text-[15px] leading-relaxed">
              {slides[slide].body}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 pt-3 pb-5">
          {slide > 0 && (
            <button
              type="button"
              onClick={() => setSlide(slide - 1)}
              className="press border-line bg-surface min-h-14 rounded-2xl border px-5 font-bold"
            >
              Back
            </button>
          )}
          {last ? (
            next ? (
              <Link
                href={next.href}
                onClick={close}
                className="press bg-pink text-ink flex min-h-14 flex-1 items-center justify-center rounded-2xl px-5 text-lg font-extrabold shadow-[0_8px_20px_-8px_var(--pink)]"
              >
                Start with step {steps.indexOf(next) + 1} →
              </Link>
            ) : (
              <Link
                href="/dashboard/appointments/new"
                onClick={close}
                className="press bg-pink text-ink flex min-h-14 flex-1 items-center justify-center rounded-2xl px-5 text-lg font-extrabold shadow-[0_8px_20px_-8px_var(--pink)]"
              >
                Make a pay link →
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={() => setSlide(slide + 1)}
              className="press bg-ink text-pink min-h-14 flex-1 rounded-2xl px-5 text-lg font-extrabold"
            >
              {slide === 0 ? "Show me" : "Next"}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}

type Slide = { eyebrow: string; title: string; body: ReactNode; visual: ReactNode };

function SLIDES(steps: TourStep[], next: TourStep | undefined, example: TourExample): Slide[] {
  return [
    {
      eyebrow: `Welcome to ${APP_NAME}`,
      title: "No more no-shows. Here's how, in 30 seconds.",
      body: (
        <p>
          Clients pay a deposit before the slot is theirs. If they ghost, you keep it. You keep
          booking in your DMs like always.
        </p>
      ),
      visual: (
        <Frame>
          <div className="flex flex-col gap-2">
            <Bubble side="in">can I get Saturday at 2? 🙏</Bubble>
            <Bubble side="out">yes! sending you the link to lock it in</Bubble>
            <div className="bg-surface ml-auto flex w-[78%] items-center gap-3 rounded-2xl p-3 shadow-[0_0_0_1px_var(--line)]">
              <span className="bg-pink text-ink font-display flex size-9 items-center justify-center rounded-full font-extrabold">
                D.
              </span>
              <span className="flex flex-col text-left">
                <span className="text-sm font-bold">Secure your spot</span>
                <span className="text-muted text-xs">$40 deposit · Sat 2:00 PM</span>
              </span>
            </div>
          </div>
        </Frame>
      ),
    },
    {
      eyebrow: "Step 1",
      title: "Agree on a time, then tap the pink +",
      body: (
        <p>
          The <strong className="text-foreground">+</strong> at the bottom of every screen makes a
          pay link. Add the client&apos;s name and service, then paste the link into your DM.
        </p>
      ),
      visual: (
        <Frame dark>
          <div className="flex items-end justify-center gap-6 pt-4">
            {["🏠", "📅"].map((e) => (
              <span key={e} className="text-2xl opacity-40 grayscale">
                {e}
              </span>
            ))}
            <span className="pop bg-pink text-ink ring-ink flex size-16 items-center justify-center rounded-[22px] text-[34px] font-extrabold shadow-[0_10px_24px_-6px_var(--pink)] ring-[6px]">
              +
            </span>
            {["🧾", "👤"].map((e) => (
              <span key={e} className="text-2xl opacity-40 grayscale">
                {e}
              </span>
            ))}
          </div>
        </Frame>
      ),
    },
    {
      eyebrow: "Step 2",
      title: "They agree to your policy and pay",
      body: (
        <p>
          Your client opens the link, ticks &ldquo;I agree&rdquo; and pays with your Cash App,
          Zelle, Venmo or a card. No app, no account. The slot isn&apos;t theirs until they do.
        </p>
      ),
      visual: (
        <Frame>
          <div className="bg-surface flex flex-col gap-3 rounded-2xl p-4 text-left shadow-[0_0_0_1px_var(--line)]">
            <div className="flex items-end justify-between">
              <span className="flex flex-col">
                <span className="text-muted text-[10px] font-bold tracking-widest uppercase">
                  Deposit
                </span>
                <span className="font-display text-2xl font-extrabold">$40.00</span>
              </span>
              <span className="border-success text-success pop -rotate-6 rounded-lg border-2 px-2 py-0.5 text-[10px] font-extrabold tracking-widest uppercase">
                Booked
              </span>
            </div>
            <span className="border-brand bg-brand-soft/50 flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold">
              <span className="bg-brand text-brand-foreground flex size-5 items-center justify-center rounded text-xs">
                ✓
              </span>
              I agree to the deposit policy
            </span>
          </div>
        </Frame>
      ),
    },
    {
      eyebrow: "Step 3",
      title: `${APP_NAME} handles the rest`,
      body: <p>You don&apos;t chase anyone. Here&apos;s what happens on its own:</p>,
      visual: (
        <Frame>
          <ul className="flex flex-col gap-2 text-left">
            {[
              ["📩", "Reminder emails", "48 and 24 hours before"],
              ["↩️", "Easy cancel", "Refunded only before your deadline"],
              ["🔒", "No-show?", "One tap and you keep the deposit"],
            ].map(([e, t, d]) => (
              <li
                key={t}
                className="bg-surface flex items-center gap-3 rounded-2xl p-3 shadow-[0_0_0_1px_var(--line)]"
              >
                <span className="bg-brand-soft flex size-10 shrink-0 items-center justify-center rounded-xl text-lg">
                  {e}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold">{t}</span>
                  <span className="text-muted text-xs">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </Frame>
      ),
    },
    {
      eyebrow: "Your home screen",
      title: "Everything you need, on one screen",
      body: (
        <>
          <p>
            <strong className="text-foreground">Needs you</strong> shows what to do: deposits to
            check, refunds to send, and who to mark as shown up or no-show.
          </p>
          <p>
            <strong className="text-foreground">Up next</strong> is your next paid client. Your{" "}
            <strong className="text-foreground">menu page</strong> link (services, prices, policy)
            goes in your Instagram bio.
          </p>
        </>
      ),
      visual: (
        <Frame>
          <div className="flex flex-col gap-2 text-left">
            <div className="bg-surface flex items-center gap-3 rounded-2xl p-3 shadow-[0_0_0_1px_var(--line)]">
              <span className="bg-brand-soft flex size-10 items-center justify-center rounded-xl text-lg">
                💸
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-bold">Jordan says they sent $40</span>
                <span className="text-muted text-xs">Needs you · tap to confirm</span>
              </span>
            </div>
            <div className="bg-ink flex items-center justify-between rounded-2xl p-3 text-white">
              <span className="flex flex-col">
                <span className="text-pink text-[10px] font-bold tracking-widest uppercase">
                  Up next
                </span>
                <span className="font-display font-extrabold">Tay · Tomorrow 2:00 PM</span>
              </span>
              <span className="text-xs font-bold text-white/80">✓ $40 in</span>
            </div>
          </div>
        </Frame>
      ),
    },
    {
      eyebrow: "Why it's worth it",
      title: "Their no-show, not your loss",
      body: example ? (
        <p>
          A no-show on your {example.service} used to cost you the whole {example.price}. Now they
          lose their {example.deposit} deposit, and you keep it. You keep your Cash App, Zelle or
          Venmo; {APP_NAME} adds what it can&apos;t do.
        </p>
      ) : (
        <p>
          A no-show used to cost you the whole appointment. Now they lose their deposit, and you
          keep it. You keep your Cash App, Zelle or Venmo; {APP_NAME} adds what it can&apos;t do.
        </p>
      ),
      visual: (
        <div className="bg-surface overflow-hidden rounded-[22px] shadow-[0_0_0_1px_var(--line)]">
          <div className="text-muted grid grid-cols-[1fr_1fr] text-[10px] font-bold tracking-widest uppercase">
            <span className="px-3 pt-3 pb-2">A Cash App deposit</span>
            <span className="bg-ink text-pink px-3 pt-3 pb-2">With {APP_NAME}</span>
          </div>
          {[
            [
              "“I didn't know it was non-refundable”",
              "They agreed to your policy first, saved with the time",
            ],
            ["Texting “still coming?”", "Reminder emails 48h and 24h before"],
            ["Arguing over a refund", "Cancel on the link; your deadline decides"],
            [
              example ? `No-show: you're out ${example.price}` : "No-show: you're out the slot",
              example
                ? `No-show: one tap, you keep ${example.deposit}`
                : "No-show: one tap, you keep the deposit",
            ],
          ].map(([without, withDibs]) => (
            <div
              key={without}
              className="border-line grid grid-cols-[1fr_1fr] border-t text-xs leading-snug"
            >
              <span className="text-muted px-3 py-2.5">{without}</span>
              <span className="bg-ink px-3 py-2.5 font-semibold text-white">{withDibs}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      eyebrow: "Get ready",
      title: next ? "Set up for your first booking" : "You're ready to take deposits",
      body: next ? (
        <p>
          A couple of minutes and you&apos;re ready. Your first pay link doesn&apos;t need a card.
        </p>
      ) : (
        <p>Next time a client asks for a time in your DMs, tap the pink + and send the link.</p>
      ),
      visual: (
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Link
                href={s.href}
                className={`press flex min-h-16 items-center gap-3 rounded-2xl p-3 shadow-[0_0_0_1px_var(--line)] ${
                  s === next ? "bg-surface outline-pink outline-[3px]" : "bg-surface"
                }`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                    s.done
                      ? "bg-pink text-ink"
                      : s === next
                        ? "bg-ink text-pink"
                        : "bg-background text-muted"
                  }`}
                >
                  {s.done ? "✓" : i + 1}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className={`font-bold ${s.done ? "text-muted" : ""}`}>{s.title}</span>
                  <span className="text-muted text-sm">{s.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ),
    },
  ];
}

function Frame({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div aria-hidden className={`rounded-[26px] p-5 ${dark ? "bg-ink" : "bg-brand-soft/60"}`}>
      {children}
    </div>
  );
}

function Bubble({ side, children }: { side: "in" | "out"; children: ReactNode }) {
  return (
    <span
      className={`max-w-[80%] rounded-[20px] px-4 py-2 text-sm ${
        side === "in"
          ? "bg-surface self-start shadow-[0_0_0_1px_var(--line)]"
          : "bg-brand text-brand-foreground self-end"
      }`}
    >
      {children}
    </span>
  );
}
