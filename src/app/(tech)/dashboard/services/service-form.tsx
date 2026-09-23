"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { DEFAULT_DEPOSIT_PERCENT, PROCESSING_FEE_LABEL } from "@/lib/config";
import { formatDuration } from "@/lib/format";
import type { FormState } from "@/lib/forms";
import { dollarsToCents, formatCents, techPayoutCents } from "@/lib/money";

export type ServiceValues = {
  name: string;
  description: string;
  duration_minutes: string;
  price: string;
  deposit: string;
};

// 15-minute steps up to 6 hours.
const DURATIONS = Array.from({ length: 24 }, (_, i) => (i + 1) * 15);

export function ServiceForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: ServiceValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const v = { ...initial, ...state.values };
  const e = state.errors ?? {};

  const [price, setPrice] = useState(v.price);
  const [deposit, setDeposit] = useState(v.deposit);
  const priceCents = dollarsToCents(price);
  const depositCents = dollarsToCents(deposit);
  const suggested =
    priceCents && priceCents > 0 ? Math.round((priceCents * DEFAULT_DEPOSIT_PERCENT) / 100) : null;
  const durationValue = Number(v.duration_minutes);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        id="name"
        label="Service name"
        defaultValue={v.name}
        error={e.name}
        placeholder="e.g. Signature service"
        required
      />
      <Textarea
        id="description"
        label="Description (optional)"
        defaultValue={v.description}
        error={e.description}
        placeholder="e.g. What's included and how to prepare."
      />
      <Select
        id="duration_minutes"
        label="How long it takes"
        defaultValue={v.duration_minutes}
        error={e.duration_minutes}
      >
        {DURATIONS.map((m) => (
          <option key={m} value={m}>
            {formatDuration(m)}
          </option>
        ))}
        {!DURATIONS.includes(durationValue) && durationValue > 0 && (
          <option value={durationValue}>{formatDuration(durationValue)}</option>
        )}
      </Select>
      <Input
        id="price"
        label="Price ($)"
        inputMode="decimal"
        defaultValue={v.price}
        onChange={(event) => setPrice(event.target.value)}
        error={e.price}
        placeholder="150"
        required
      />
      <Input
        id="deposit"
        label="Deposit ($)"
        inputMode="decimal"
        defaultValue={v.deposit}
        onChange={(event) => setDeposit(event.target.value)}
        error={e.deposit}
        hint={
          depositCents && depositCents >= 50
            ? `You receive ${formatCents(techPayoutCents(depositCents))} after the ${PROCESSING_FEE_LABEL} processing fee.`
            : suggested
              ? `Clients pay this to book. Most pros ask ${DEFAULT_DEPOSIT_PERCENT}%, which is ${formatCents(suggested)}.`
              : "Clients pay this to book. It goes toward the price."
        }
        placeholder="40"
        required
      />
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
