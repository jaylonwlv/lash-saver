"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { APP_NAME, ASSISTANT_NAME, FOUNDER_EMAIL } from "@/lib/config";
import dib from "./dib.png";
import { parseAnswer } from "./format";
import { ASSISTANT_LINKS, type Surface } from "./links";

/*
 * "Ask Dib", the help chat: a floating button on the marketing site's main pages and
 * a Help button in the pro's app header, both opening the same panel. Answers come
 * from /api/assistant. Never on pay links or menu pages (clients don't see Dib).
 */

type Turn = { role: "user" | "assistant"; content: string; question?: string };

const SUGGESTIONS: Record<Surface, string[]> = {
  site: [
    "Will my clients really pay a deposit?",
    "What happens if a client cancels?",
    "How do I get paid?",
    "What does it cost?",
  ],
  app: [
    "How do I mark a no-show?",
    "How do I change a deposit for one client?",
    "How do I take card payments?",
    "A client says they paid but I don't see it",
  ],
};

const FAILED = "Something went wrong on my end. Try again, or [Email us](email).";
// The floating button shows on these marketing pages only (never mid-sign-up).
const SITE_PAGES = new Set(["/", "/detailers", "/demo", "/catering"]);
const NUDGE_KEY = "dibs:dib-nudge";

/** The marketing site's floating button, with a one-time "Questions? Ask me" nudge. */
export function AssistantLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(NUDGE_KEY) === "1";
    } catch {}
    if (seen) return;
    const timer = setTimeout(() => setNudge(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  const hideNudge = () => {
    setNudge(false);
    try {
      sessionStorage.setItem(NUDGE_KEY, "1");
    } catch {}
  };

  if (!SITE_PAGES.has(pathname)) return null;
  return (
    <div data-theme="dark">
      <div className="fixed right-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2.5 md:bottom-6">
        {nudge && !open && (
          <div className="bg-surface text-foreground flex items-center gap-2 rounded-2xl rounded-br-md py-2.5 pr-2 pl-3.5 text-[15px] font-semibold shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)]">
            <button type="button" onClick={() => setOpen(true)} className="min-h-6">
              Questions? Ask me
            </button>
            <button
              type="button"
              onClick={hideNudge}
              aria-label="Hide"
              className="text-muted flex size-7 items-center justify-center text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            hideNudge();
            setOpen(true);
            window.clarity?.("event", "dib_open");
          }}
          aria-label={`Ask ${ASSISTANT_NAME} a question`}
          className="press border-pink size-15 shrink-0 overflow-hidden rounded-full border-[3px] bg-black shadow-[0_10px_28px_-6px_rgba(255,92,157,0.55)]"
        >
          <Image src={dib} alt="" width={60} height={60} className="size-full" priority={false} />
        </button>
      </div>
      {open && <AssistantPanel surface="site" onClose={() => setOpen(false)} />}
    </div>
  );
}

/** The pro's app: a Help button in the header. */
export function AssistantHelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ask ${ASSISTANT_NAME} for help`}
        className="press flex min-h-11 items-center gap-2 rounded-full bg-black/10 py-1 pr-3.5 pl-1 text-sm font-bold dark:bg-white/10"
      >
        <Image src={dib} alt="" width={34} height={34} className="size-[34px] rounded-full" />
        Help
      </button>
      {open && <AssistantPanel surface="app" onClose={() => setOpen(false)} />}
    </>
  );
}

function AssistantPanel({ surface, onClose }: { surface: Surface; onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [rated, setRated] = useState<Record<number, boolean>>({});
  const end = useRef<HTMLDivElement>(null);

  // While open, the page behind doesn't scroll, and Escape closes it wherever focus is.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, pending]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || pending) return;
    const history: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(history);
    setDraft("");
    setPending(true);
    // Up to the last 16 messages, starting with the person's.
    let sent = history.slice(-16);
    if (sent[0]?.role === "assistant") sent = sent.slice(1);
    let answer = FAILED;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          surface,
          messages: sent.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (data && typeof data === "object" && "answer" in data && typeof data.answer === "string") {
        answer = data.answer;
      }
    } catch {}
    setTurns([...history, { role: "assistant", content: answer, question }]);
    setPending(false);
  }

  function rate(index: number, turn: Turn, helpful: boolean) {
    setRated((r) => ({ ...r, [index]: helpful }));
    void fetch("/api/assistant/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        surface,
        helpful,
        question: (turn.question ?? "").slice(0, 600),
        answer: turn.content.slice(0, 4000),
      }),
    }).catch(() => {});
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(draft);
  };

  // Opened only by a tap, so the page exists. In the app, render inside its themed
  // wrapper (light or dark); on the site, on the page itself.
  if (typeof document === "undefined") return null;
  const host =
    surface === "app" ? (document.querySelector("[data-app]") ?? document.body) : document.body;
  const allowed = ASSISTANT_LINKS[surface];
  const panel = (
    <div data-theme={surface === "site" ? "dark" : undefined} className="contents">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/55"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Ask ${ASSISTANT_NAME}`}
        data-clarity-mask="true"
        className="bg-surface text-foreground border-line fixed inset-x-0 top-[max(4.5rem,env(safe-area-inset-top))] bottom-0 z-50 flex flex-col rounded-t-[28px] border-t md:inset-x-auto md:top-auto md:right-6 md:bottom-6 md:h-[640px] md:w-[400px] md:rounded-[28px] md:border md:shadow-2xl"
      >
        <div className="flex justify-center pt-2 md:hidden" aria-hidden>
          <span className="bg-line h-1.5 w-10 rounded-full" />
        </div>
        <header className="border-line flex items-center gap-3 border-b px-4 pt-3 pb-3.5">
          <Image
            src={dib}
            alt=""
            width={44}
            height={44}
            className="border-pink size-11 rounded-full border-2"
          />
          <div className="flex flex-1 flex-col">
            <span className="font-display text-xl font-extrabold tracking-tight">
              {ASSISTANT_NAME}
            </span>
            <span className="text-muted text-[13px]">
              Your {APP_NAME} helper ·{" "}
              {surface === "site" ? "answers in seconds" : "bookings and account"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="bg-background flex size-11 items-center justify-center rounded-full"
          >
            <svg aria-hidden width="16" height="16" viewBox="0 0 16 16">
              <path
                d="M3 3 L13 13 M13 3 L3 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
          <Bubble>
            Hey, I&apos;m {ASSISTANT_NAME}! Ask me anything about {APP_NAME}: deposits,
            cancellations, getting paid, pricing. What&apos;s on your mind?
          </Bubble>
          {turns.length === 0 && (
            <div className="flex flex-col gap-2 pl-10">
              <p className="text-muted mt-1 text-[13px] font-semibold">People often ask</p>
              {SUGGESTIONS[surface].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  className="press border-brand/40 text-brand min-h-11 rounded-2xl border px-3.5 py-2 text-left text-[15px] font-semibold"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {turns.map((turn, i) =>
            turn.role === "user" ? (
              <p
                key={i}
                className="bg-pink text-ink max-w-[85%] self-end rounded-2xl rounded-br-md px-3.5 py-2.5 text-base font-medium break-words"
              >
                {turn.content}
              </p>
            ) : (
              <Answer
                key={i}
                text={turn.content}
                allowed={allowed}
                onNavigate={onClose}
                rated={rated[i]}
                onRate={turn.content === FAILED ? undefined : (helpful) => rate(i, turn, helpful)}
              />
            ),
          )}
          {pending && (
            <Bubble>
              <span
                className="text-muted inline-flex gap-1"
                aria-label={`${ASSISTANT_NAME} is typing`}
              >
                <span className="animate-pulse">●</span>
                <span className="animate-pulse [animation-delay:150ms]">●</span>
                <span className="animate-pulse [animation-delay:300ms]">●</span>
              </span>
            </Bubble>
          )}
          <div ref={end} />
        </div>

        <form
          onSubmit={submit}
          className="border-line flex items-center gap-2 border-t px-3 pt-2.5 pb-2"
        >
          <label htmlFor="dib-question" className="sr-only">
            Your question
          </label>
          <input
            id="dib-question"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={600}
            autoComplete="off"
            enterKeyHint="send"
            placeholder="Ask a question…"
            className="border-line bg-background min-h-12 flex-1 rounded-full border px-4 text-base outline-none focus:border-[var(--pink)]"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={pending || !draft.trim()}
            className="press bg-pink flex size-12 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
          >
            <svg aria-hidden width="20" height="20" viewBox="0 0 20 20">
              <path
                d="M10 16 L10 4 M4.5 9.5 L10 4 L15.5 9.5"
                fill="none"
                stroke="#0d0b0c"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
        <p className="text-muted px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs">
          AI answers can be wrong. Billing or account problem?{" "}
          <a href={`mailto:${FOUNDER_EMAIL}`} className="text-brand underline">
            Email us
          </a>
        </p>
      </section>
    </div>
  );
  return createPortal(panel, host);
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2.5">
      <Image
        src={dib}
        alt=""
        width={30}
        height={30}
        className="size-[30px] shrink-0 rounded-full"
      />
      <div className="bg-background max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-3 text-base leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function Answer({
  text,
  allowed,
  onNavigate,
  rated,
  onRate,
}: {
  text: string;
  allowed: Record<string, string>;
  onNavigate: () => void;
  rated: boolean | undefined;
  onRate?: (helpful: boolean) => void;
}) {
  const { lines, links } = parseAnswer(text, allowed, FOUNDER_EMAIL);
  return (
    <div className="flex items-end gap-2.5">
      <Image
        src={dib}
        alt=""
        width={30}
        height={30}
        className="size-[30px] shrink-0 self-start rounded-full"
      />
      <div className="flex max-w-[85%] flex-col gap-2">
        <div className="bg-background flex flex-col gap-2 rounded-2xl rounded-bl-md px-3.5 py-3 text-base leading-relaxed break-words">
          {lines.map((line, i) => (
            <p key={i} className={line.bullet ? "flex gap-2" : undefined}>
              {line.bullet && (
                <span aria-hidden className="text-brand">
                  •
                </span>
              )}
              <span>
                {line.pieces.map((p, j) =>
                  p.bold ? <strong key={j}>{p.text}</strong> : <span key={j}>{p.text}</span>,
                )}
              </span>
            </p>
          ))}
        </div>
        {links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map((l, i) =>
              l.email ? (
                <a
                  key={l.href}
                  href={l.href}
                  className="press border-brand text-brand inline-flex min-h-10 items-center rounded-xl border px-3.5 text-sm font-bold"
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={onNavigate}
                  className={`press inline-flex min-h-10 items-center rounded-xl px-3.5 text-sm font-bold ${
                    i === 0 ? "bg-pink text-ink" : "border-line border"
                  }`}
                >
                  {l.label}
                </Link>
              ),
            )}
          </div>
        )}
        {onRate && (
          <div className="text-muted flex items-center gap-1.5 text-xs">
            {rated === undefined ? (
              <>
                <span>Helpful?</span>
                <button
                  type="button"
                  onClick={() => onRate(true)}
                  aria-label="Helpful"
                  className="border-line flex size-8 items-center justify-center rounded-full border"
                >
                  <svg aria-hidden width="14" height="14" viewBox="0 0 14 14">
                    <path
                      d="M3 7.5 L6 10.5 L11.5 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onRate(false)}
                  aria-label="Not helpful"
                  className="border-line flex size-8 items-center justify-center rounded-full border"
                >
                  <svg aria-hidden width="14" height="14" viewBox="0 0 14 14">
                    <path
                      d="M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </>
            ) : (
              <span>{rated ? "Thanks!" : "Thanks. That helps me get better."}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
