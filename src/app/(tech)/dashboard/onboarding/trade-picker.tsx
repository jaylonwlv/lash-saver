"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import type { TradeId } from "@/lib/supabase/database.types";
import { chooseTrade } from "./actions";

type Option = { id: TradeId; label: string; emoji: string };

/** First visit: "What do you do?" One tap adds a starter menu; skipping is just as quick. */
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

  return (
    <form
      action={action}
      className="border-brand bg-surface flex flex-col gap-4 rounded-2xl border-2 p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">What do you do?</h2>
        {hasServices ? (
          <p className="text-muted text-sm">
            One tap. Only you see this, and it won&apos;t change your services.
          </p>
        ) : (
          <p className="text-muted text-sm">
            One tap and we&apos;ll add a few starter services with typical prices and deposits, so
            you&apos;re ready to send a pay link in a minute.{" "}
            <strong className="text-foreground">Edit them to match your prices.</strong>
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[...options, other].map((o) => (
          <button
            key={o.id}
            type="submit"
            name="trade"
            value={o.id}
            disabled={pending}
            className="border-line bg-background active:border-brand flex min-h-14 items-center gap-2 rounded-xl border px-3 text-left text-sm font-medium disabled:opacity-60"
          >
            <span aria-hidden className="text-lg">
              {o.emoji}
            </span>
            {o.label}
          </button>
        ))}
      </div>
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
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
