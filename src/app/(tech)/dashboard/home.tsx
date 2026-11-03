import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/*
 * The pieces of the dashboard home. Presentational only: page.tsx loads the data
 * and decides what to show. Cards rise in one after another (`i` sets the order).
 */

const order = (i: number) => ({ "--i": i }) as CSSProperties;

/** The pink greeting band that continues the header, with today's snapshot under it. */
export function Hero({
  today,
  greeting,
  badge,
  children,
}: {
  today: string;
  greeting: string;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="bg-pink text-ink relative -mx-5 -mt-6 overflow-hidden rounded-b-[32px] px-5 pt-1 pb-6 sm:mx-0 sm:mt-0 sm:rounded-[32px] sm:pt-6">
      {/* A soft glow in the corner gives the band some depth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-white/30 blur-3xl"
      />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-ink/70 text-sm font-semibold">{today}</p>
          <h1
            className={`${greeting.length > 24 ? "text-[30px]" : "text-[38px]"} leading-[1] font-extrabold tracking-[-0.03em] break-words`}
          >
            {greeting}
            {/* No break before the wave, so it never sits alone on a line. */}
            {" 👋"}
          </h1>
        </div>
        {badge}
        {children}
      </div>
    </section>
  );
}

/** A number in the greeting band: tappable, so each one leads somewhere useful. */
export function Stat({
  href,
  value,
  label,
  hot = false,
}: {
  href: string;
  value: string | number;
  label: string;
  /** Needs attention: inverted colors. */
  hot?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`press flex min-h-[86px] flex-col justify-between rounded-[20px] p-3.5 ${
        hot ? "bg-ink text-white" : "text-ink bg-white/55"
      }`}
    >
      <span
        className={`font-display text-[30px] leading-none font-extrabold tracking-tight ${hot ? "text-pink" : ""}`}
      >
        {value}
      </span>
      <span
        className={`text-xs leading-tight font-semibold ${hot ? "text-white/80" : "text-ink/70"}`}
      >
        {label}
      </span>
    </Link>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

/** The free-trial chip in the greeting band. */
export function Badge({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="press bg-ink text-pink inline-flex min-h-10 w-fit items-center gap-2 rounded-full px-4 text-sm font-bold"
    >
      <span aria-hidden className="bg-pink size-2 animate-pulse rounded-full" />
      {children}
    </Link>
  );
}

/** The main thing a pro does here: make a pay link. */
export function NewAppointmentCard({ hint, i = 0 }: { hint: string; i?: number }) {
  return (
    <Link
      href="/dashboard/appointments/new"
      style={order(i)}
      className="rise press bg-ink relative flex min-h-28 items-center justify-between gap-4 overflow-hidden rounded-[28px] p-5 text-white"
    >
      <div
        aria-hidden
        className="bg-pink/40 pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full blur-3xl"
      />
      <span className="relative flex flex-col gap-1.5">
        <span className="text-pink text-xs font-bold tracking-[0.12em] uppercase">
          Booked in the DMs?
        </span>
        <span className="font-display text-[26px] leading-none font-extrabold tracking-tight">
          New appointment
        </span>
        <span className="text-sm text-white/70">{hint}</span>
      </span>
      <span
        aria-hidden
        className="bg-pink text-ink relative flex size-14 shrink-0 items-center justify-center rounded-[20px] text-[32px] leading-none font-extrabold shadow-[0_8px_20px_-6px_var(--pink)]"
      >
        +
      </span>
    </Link>
  );
}

export type Task = { href: string; emoji: string; title: string; detail: string };

/** What needs the pro now: deposits to check, refunds to send, appointments to close. */
export function NeedsYou({ tasks, more, i = 0 }: { tasks: Task[]; more: number; i?: number }) {
  return (
    <section style={order(i)} className="rise card flex flex-col gap-1 p-2">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <h2 className="font-display text-xl font-extrabold tracking-tight">Needs you</h2>
        <span className="bg-pink text-ink rounded-full px-2.5 py-0.5 text-sm font-extrabold">
          {tasks.length + more}
        </span>
      </div>
      <ul className="flex flex-col">
        {tasks.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="press active:bg-background flex min-h-16 items-center gap-3 rounded-[18px] px-3 py-2"
            >
              <span
                aria-hidden
                className="bg-brand-soft flex size-11 shrink-0 items-center justify-center rounded-[14px] text-xl"
              >
                {t.emoji}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-bold">{t.title}</span>
                <span className="text-muted truncate text-sm">{t.detail}</span>
              </span>
              <span aria-hidden className="text-muted text-lg">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <Link
          href="/dashboard/appointments"
          className="text-brand flex min-h-11 items-center justify-center text-sm font-semibold"
        >
          +{more} more in Bookings
        </Link>
      )}
    </section>
  );
}

/** The next confirmed appointment, as a ticket. */
export function NextUp({
  href,
  client,
  service,
  day,
  time,
  deposit,
  i = 0,
}: {
  href: string;
  client: string;
  service: string;
  day: string;
  time: string;
  deposit: string;
  i?: number;
}) {
  return (
    <Link
      href={href}
      style={order(i)}
      className="rise press card relative flex flex-col gap-4 overflow-hidden p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-brand text-xs font-bold tracking-[0.12em] uppercase">Up next</span>
          <span className="font-display truncate text-[26px] leading-none font-extrabold tracking-tight">
            {client}
          </span>
          <span className="text-muted truncate text-sm">{service}</span>
        </div>
        <span className="bg-ink flex shrink-0 flex-col items-center rounded-[16px] px-3 py-2 text-white">
          <span className="text-pink text-[11px] font-bold uppercase">{day}</span>
          <span className="font-display text-lg leading-tight font-extrabold">{time}</span>
        </span>
      </div>
      <span className="bg-success/10 text-success w-fit rounded-full px-3 py-1 text-sm font-bold">
        ✓ {deposit} deposit in
      </span>
    </Link>
  );
}

/** Money the pro kept from no-shows and late cancels. */
export function Results({
  headline,
  lines,
  i = 0,
}: {
  headline: string;
  lines: string[];
  i?: number;
}) {
  return (
    <section
      style={order(i)}
      className="rise bg-ink relative flex flex-col gap-2 overflow-hidden rounded-[28px] p-5 text-white"
    >
      <div
        aria-hidden
        className="bg-pink/30 pointer-events-none absolute -top-16 -right-16 size-48 rounded-full blur-3xl"
      />
      <p className="text-pink relative text-xs font-bold tracking-[0.12em] uppercase">
        Your results
      </p>
      <h2 className="font-display text-pink relative text-[34px] leading-[1] font-extrabold tracking-tight">
        {headline}
      </h2>
      {lines.length > 0 && (
        <ul className="relative flex flex-col gap-1 text-sm text-white/80">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** A square shortcut. Labels shrink on the narrowest phones so they fit. */
export function Tile({
  href,
  emoji,
  label,
  note,
  i = 0,
}: {
  href: string;
  emoji: string;
  label: string;
  note?: string;
  i?: number;
}) {
  return (
    <Link
      href={href}
      style={order(i)}
      className="rise press card flex min-h-28 flex-col justify-between gap-3 p-4"
    >
      <span
        aria-hidden
        className="bg-brand-soft flex size-11 items-center justify-center rounded-[14px] text-xl leading-none"
      >
        {emoji}
      </span>
      <span className="flex flex-col">
        <span className="text-base font-extrabold max-[359px]:text-sm">{label}</span>
        {note && <span className="text-muted text-xs">{note}</span>}
      </span>
    </Link>
  );
}

/** "3 of 4" as a ring: progress already made pulls people through the rest. */
export function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-16 shrink-0">
      <svg aria-hidden viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="8" className="stroke-ink/15" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-ink"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - done / total)}
        />
      </svg>
      <span className="font-display absolute inset-0 flex items-center justify-center text-lg font-extrabold">
        {done}/{total}
      </span>
    </div>
  );
}

export type StepStatus = "done" | "todo" | "waiting";

const statusLabel: Record<StepStatus, string> = {
  done: "Done",
  todo: "To do",
  waiting: "In review",
};

/**
 * One setup step. The current one gets a pink ring; finished ones fold into a
 * slim row with a small link to change them.
 */
export function Step({
  number,
  title,
  status,
  current,
  description,
  edit,
  children,
  i = 0,
}: {
  number: number;
  title: string;
  status: StepStatus;
  current: boolean;
  description: string;
  /** Shown on a finished step instead of its buttons. */
  edit?: { href: string; label: string };
  children?: ReactNode;
  i?: number;
}) {
  const done = status === "done";
  if (done) {
    return (
      <li style={order(i)} className="rise card flex min-h-16 items-center gap-3 px-4 py-3">
        <span
          aria-hidden
          className="bg-pink text-ink flex size-8 shrink-0 items-center justify-center rounded-[10px] text-sm font-extrabold"
        >
          ✓
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-bold">{title}</span>
          {edit && <span className="text-muted truncate text-sm">{edit.label}</span>}
        </span>
        {edit && (
          <Link
            href={edit.href}
            className="text-brand inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-bold"
          >
            Edit
          </Link>
        )}
      </li>
    );
  }
  return (
    <li
      style={order(i)}
      className={`rise card flex flex-col gap-3 p-4 ${current ? "outline-pink outline-[3px]" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex size-9 shrink-0 items-center justify-center rounded-[12px] text-sm font-extrabold ${
            current ? "bg-ink text-pink" : "bg-background text-muted"
          }`}
        >
          {number}
        </span>
        <h2 className="font-display min-w-0 flex-1 text-lg leading-tight font-extrabold tracking-tight">
          {title}
        </h2>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            status === "waiting" ? "bg-brand-soft text-brand" : "text-muted"
          }`}
        >
          {statusLabel[status]}
        </span>
      </div>
      <p className="text-muted text-sm">{description}</p>
      {children && <div className="flex flex-col gap-2">{children}</div>}
    </li>
  );
}
