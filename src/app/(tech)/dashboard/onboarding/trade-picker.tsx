"use client";

import { useActionState, useSyncExternalStore } from "react";
import type { FormState } from "@/lib/forms";
import type { TradeId } from "@/lib/supabase/database.types";
import { chooseTrade } from "./actions";

type Option = {
  id: TradeId;
  label: string;
  emoji: string;
  /** The starter services this adds, e.g. "Haircut · Haircut + beard · Lineup". */
  preview?: string;
};

/**
 * First visit: "What do you do?" as a one-column list of big rows (emoji, name,
 * what gets added), easy to scan and tap on a phone. One tap adds the starter
 * menu; "Something else" and Skip are just as quick.
 */
export function TradePicker({
  options,
  other,
  hasServices,
}: {
  options: Option[];
  other: Option;
  /** Pros who already set up services just tell us their trade; nothing is added. */
  hasServices: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(chooseTrade, {});
  // The phone's time zone, so reminders go out at the right time (the server can't see it).
  const timeZone = useSyncExternalStore(
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );

  return (
    <form
      action={action}
      className="border-brand bg-surface flex flex-col gap-4 rounded-2xl border-2 p-4"
    >
      <input type="hidden" name="timezone" value={timeZone} />
      <div className="flex flex-col gap-1 px-1 pt-1">
        <p className="text-brand text-xs font-semibold tracking-wide uppercase">
          {hasServices ? "One quick question" : "Quick setup · one tap"}
        </p>
        <h2 className="text-xl font-bold">What do you do?</h2>
        {hasServices ? (
          <p className="text-muted text-sm">
            Only you see this, and it won&apos;t change your services.
          </p>
        ) : (
          <p className="text-muted text-sm">
            We&apos;ll add starter services with typical prices and deposits.{" "}
            <strong className="text-foreground">Edit them to match your prices.</strong>
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
        {options.map((o) => (
          <li key={o.id}>
            <TradeRow option={o} pending={pending} showPreview={!hasServices} />
          </li>
        ))}
      </ul>

      <div className="border-line border-t pt-3">
        <TradeRow option={other} pending={pending} showPreview={false} />
      </div>

      {state.message && <p className="text-danger px-1 text-sm">{state.message}</p>}
      <button
        type="submit"
        name="trade"
        value={other.id}
        disabled={pending}
        className="text-muted min-h-12 text-sm underline disabled:opacity-60"
      >
        {pending ? "Saving…" : hasServices ? "Skip" : "Skip, I'll add my own services"}
      </button>
    </form>
  );
}

function TradeRow({
  option,
  pending,
  showPreview,
}: {
  option: Option;
  pending: boolean;
  showPreview: boolean;
}) {
  return (
    <button
      type="submit"
      name="trade"
      value={option.id}
      disabled={pending}
      className="border-line bg-background active:border-brand active:bg-brand-soft/40 flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left disabled:opacity-60"
    >
      <span
        aria-hidden
        className="bg-surface border-line flex size-11 shrink-0 items-center justify-center rounded-xl border text-2xl"
      >
        {option.emoji}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{option.label}</span>
        {showPreview && option.preview && (
          <span className="text-muted truncate text-sm">{option.preview}</span>
        )}
      </span>
      <span aria-hidden className="text-muted text-xl">
        ›
      </span>
    </button>
  );
}
