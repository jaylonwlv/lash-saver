"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";
import { confirmPrices } from "./actions";

type Row = { id: string; name: string; price: string; deposit: string };

export function ConfirmPricesForm({ services }: { services: Row[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(confirmPrices, {});
  const v = state.values;
  const e = state.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-3">
      {services.map((s) => {
        const offered = v ? v[`offer_${s.id}`] === "on" : true;
        return (
          // Keyed on the submitted values so React resets each row to what they sent.
          <div
            key={`${s.id}-${v ? "sent" : "new"}`}
            className="card flex flex-col gap-3 p-4 has-[input[type=checkbox]:not(:checked)]:opacity-60"
          >
            <label className="flex min-h-11 items-center justify-between gap-3">
              <span className="font-bold">{s.name}</span>
              <span className="text-muted flex items-center gap-2 text-sm">
                I offer this
                <input
                  type="checkbox"
                  name={`offer_${s.id}`}
                  defaultChecked={offered}
                  className="accent-brand size-5"
                />
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Money
                id={`price_${s.id}`}
                label="Price"
                value={v?.[`price_${s.id}`] ?? s.price}
                error={e[`price_${s.id}`]}
              />
              <Money
                id={`deposit_${s.id}`}
                label="Deposit"
                value={v?.[`deposit_${s.id}`] ?? s.deposit}
                error={e[`deposit_${s.id}`]}
              />
            </div>
          </div>
        );
      })}
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <p className="text-muted text-sm">
        Untick any you don&apos;t offer; they stay off your page. You can change names, times and
        descriptions later under Services.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save my prices"}
      </Button>
    </form>
  );
}

function Money({
  id,
  label,
  value,
  error,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <span className="border-line bg-surface focus-within:border-brand flex min-h-12 items-center rounded-xl border px-3">
        <span aria-hidden className="text-muted">
          $
        </span>
        <input
          id={id}
          name={id}
          defaultValue={value}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full bg-transparent px-1 text-base outline-none"
        />
      </span>
      {error && (
        <span id={`${id}-error`} className="text-danger text-xs font-normal">
          {error}
        </span>
      )}
    </label>
  );
}
