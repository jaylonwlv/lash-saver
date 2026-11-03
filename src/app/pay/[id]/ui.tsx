import type { CSSProperties, ReactNode } from "react";

/*
 * The client-facing pay page's look, shared by the real pay link and the demo.
 * Light page (it opens inside Instagram's browser), black header with the pro's
 * name, and the booking shown as a ticket.
 */

/** Black band with the pro's name: whose page this is, before anything else. */
export function PayHeader({ business }: { business: string }) {
  return (
    <header className="bg-ink px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-white">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="bg-pink text-ink font-display flex size-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold"
          >
            {business.trim().charAt(0).toUpperCase() || "•"}
          </span>
          <span className="truncate font-bold">{business}</span>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
          <Lock className="size-3.5" /> Secure
        </span>
      </div>
    </header>
  );
}

export function PayTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="rise flex flex-col gap-1">
      {eyebrow && <p className="text-brand text-sm font-bold">{eyebrow}</p>}
      <h1 className="font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em]">
        {title}
      </h1>
    </div>
  );
}

/**
 * The booking as a ticket: what and when on top, the deposit below a perforated
 * line. `stamp` marks a paid booking.
 */
export function Ticket({
  service,
  when,
  deposit,
  rest,
  stamp,
}: {
  service: string;
  when: string;
  deposit: string;
  /** What's left to pay at the appointment, if anything. */
  rest: string | null;
  stamp?: { label: string; tone: "success" | "brand" | "muted" };
}) {
  return (
    <section
      className="rise bg-surface relative overflow-hidden rounded-[26px] shadow-[0_0_0_1px_var(--line),0_14px_36px_-18px_rgb(120_40_70_/_0.35)]"
      style={{ "--i": 1 } as CSSProperties}
    >
      <div className="bg-brand-soft/60 flex flex-col gap-3 px-5 pt-5 pb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-muted text-xs font-bold tracking-[0.12em] uppercase">
              Appointment
            </span>
            <span className="font-display text-[24px] leading-tight font-extrabold tracking-tight break-words">
              {service}
            </span>
          </div>
          {stamp && (
            <span
              className={`pop shrink-0 -rotate-6 rounded-xl border-[3px] px-2.5 py-1 text-xs font-extrabold tracking-[0.1em] uppercase ${
                stamp.tone === "success"
                  ? "border-success text-success"
                  : stamp.tone === "brand"
                    ? "border-brand text-brand"
                    : "border-muted text-muted"
              }`}
            >
              {stamp.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="text-lg">
            🗓️
          </span>
          {when}
        </div>
      </div>
      {/* Perforation: two notches and a dashed line, like a tear-off stub. */}
      <div aria-hidden className="relative h-0">
        <span className="bg-background absolute -top-3 -left-3 size-6 rounded-full shadow-[inset_-1px_0_0_var(--line)]" />
        <span className="bg-background absolute -top-3 -right-3 size-6 rounded-full shadow-[inset_1px_0_0_var(--line)]" />
        <span className="border-line absolute inset-x-5 top-0 border-t-2 border-dashed" />
      </div>
      <div className="flex items-end justify-between gap-3 px-5 pt-5 pb-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted text-xs font-bold tracking-[0.12em] uppercase">Deposit</span>
          <span className="font-display text-[34px] leading-none font-extrabold tracking-tight">
            {deposit}
          </span>
        </div>
        {rest && (
          <span className="text-muted pb-1 text-right text-sm">
            {rest}
            <br />
            due at your appointment
          </span>
        )}
      </div>
    </section>
  );
}

/**
 * The refund rule as a two-step timeline, then the pro's full policy. Seeing the
 * deadline as a date is clearer than "48 hours before".
 */
export function PolicyCard({ refundBy, policy }: { refundBy: string | null; policy: string }) {
  return (
    <section
      className="rise bg-surface flex flex-col gap-4 rounded-[24px] p-5 shadow-[0_0_0_1px_var(--line)]"
      style={{ "--i": 2 } as CSSProperties}
    >
      <h2 className="font-display text-lg font-extrabold tracking-tight">Deposit policy</h2>
      {refundBy && (
        <ol className="flex flex-col">
          <li className="flex gap-3">
            <span className="flex flex-col items-center">
              <span className="bg-success mt-1 size-3 rounded-full" />
              <span className="bg-line w-0.5 flex-1" />
            </span>
            <span className="flex flex-col pb-4">
              <span className="text-sm font-bold">Until {refundBy}</span>
              <span className="text-muted text-sm">Cancel and get your deposit back</span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="bg-brand mt-1 size-3 shrink-0 rounded-full" />
            <span className="flex flex-col">
              <span className="text-sm font-bold">After that, or a no-show</span>
              <span className="text-muted text-sm">The deposit is kept</span>
            </span>
          </li>
        </ol>
      )}
      <p className="text-muted border-line border-t pt-4 text-sm whitespace-pre-line">{policy}</p>
    </section>
  );
}

/** A status message: success gets a check that pops in. */
export function Notice({ tone, children }: { tone?: "success"; children: ReactNode }) {
  if (tone === "success") {
    return (
      <div className="rise bg-surface flex items-start gap-3 rounded-[22px] p-4 shadow-[0_0_0_1px_var(--line)]">
        <span
          aria-hidden
          className="pop bg-success flex size-9 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white"
        >
          ✓
        </span>
        <p className="pt-1.5">{children}</p>
      </div>
    );
  }
  return (
    <p className="rise bg-surface rounded-[22px] p-5 shadow-[0_0_0_1px_var(--line)]">{children}</p>
  );
}

export function Lock({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      className={className}
    >
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

/** The "I agree" checkbox as a big tappable card that turns pink when ticked. */
export function AgreeBox({
  defaultChecked,
  invalid,
  describedBy,
}: {
  defaultChecked: boolean;
  invalid: boolean;
  describedBy?: string;
}) {
  return (
    <label
      className={`press has-[:checked]:border-brand has-[:checked]:bg-brand-soft/50 bg-surface flex min-h-14 cursor-pointer items-center gap-3 rounded-[20px] border-2 p-4 ${
        invalid ? "border-danger" : "border-line"
      }`}
    >
      <input
        type="checkbox"
        name="agree"
        defaultChecked={defaultChecked}
        className="accent-brand size-6 shrink-0"
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
      />
      <span className="font-semibold">I&apos;ve read and agree to the deposit policy</span>
    </label>
  );
}
