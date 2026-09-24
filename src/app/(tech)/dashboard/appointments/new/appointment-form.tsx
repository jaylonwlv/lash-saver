"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { centsToDollarsInput, dollarsToCents, formatCents, techPayoutCents } from "@/lib/money";

/** "40" for whole dollars, "40.50" otherwise: easier to read and edit on a phone. */
const depositInput = (cents: number) =>
  cents % 100 === 0 ? String(cents / 100) : centsToDollarsInput(cents);
import { createAppointment } from "../actions";

export type ServiceOption = { id: string; label: string; priceCents: number; depositCents: number };

export function AppointmentForm({
  services,
  today,
  timeZoneLabel,
  cardFees,
}: {
  services: ServiceOption[];
  today: string;
  timeZoneLabel: string;
  /** Deposits go through Stripe, so show what the pro receives after the card fee. */
  cardFees: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createAppointment, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  // The deposit starts at the service's default and follows the service picker,
  // but the pro can change it for this one client (a regular, a holiday slot).
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const [deposit, setDeposit] = useState(service ? depositInput(service.depositCents) : "");
  const depositCents = dollarsToCents(deposit);
  const depositHint = !service
    ? undefined
    : [
        depositCents !== null && depositCents !== service.depositCents
          ? `Just for this client. Your usual deposit for this service is ${formatCents(service.depositCents)}.`
          : `Your usual deposit for this service. Change it for this client if you like.`,
        cardFees && depositCents !== null && depositCents > 0
          ? `You receive ${formatCents(techPayoutCents(depositCents))} after the card fee.`
          : null,
      ]
        .filter(Boolean)
        .join(" ");

  return (
    <form action={action} className="flex flex-col gap-5">
      <Select
        id="service_id"
        label="Service"
        defaultValue={v.service_id ?? services[0]?.id}
        error={e.service_id}
        onChange={(event) => {
          const next = services.find((s) => s.id === event.target.value);
          setServiceId(event.target.value);
          if (next) setDeposit(depositInput(next.depositCents));
        }}
      >
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </Select>
      <Input
        id="deposit"
        label={service ? `Deposit (price ${formatCents(service.priceCents)})` : "Deposit"}
        inputMode="decimal"
        autoComplete="off"
        value={deposit}
        onChange={(event) => setDeposit(event.target.value)}
        error={e.deposit}
        hint={depositHint}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="date"
          label="Date"
          type="date"
          min={today}
          defaultValue={v.date}
          error={e.date}
          required
        />
        <Input
          id="time"
          label="Time"
          type="time"
          step={900}
          defaultValue={v.time}
          error={e.time}
          required
        />
      </div>
      <p className="text-muted -mt-3 text-sm">Your time zone: {timeZoneLabel}</p>
      <Input
        id="client_name"
        label="Client name"
        autoComplete="off"
        defaultValue={v.client_name}
        error={e.client_name}
        required
      />
      <Input
        id="client_email"
        label="Client email"
        type="email"
        inputMode="email"
        autoComplete="off"
        defaultValue={v.client_email}
        error={e.client_email}
        hint="We email their confirmation here."
        required
      />
      <Input
        id="client_instagram"
        label="Client Instagram (optional)"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="@theirhandle"
        defaultValue={v.client_instagram}
        error={e.client_instagram}
      />
      <Input
        id="client_phone"
        label="Client phone (optional)"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        defaultValue={v.client_phone}
        error={e.client_phone}
      />
      <Textarea
        id="notes"
        label="Notes (optional)"
        defaultValue={v.notes}
        error={e.notes}
        hint="Only you see these."
        placeholder="e.g. Preferences, allergies, anything to remember."
      />
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create pay link"}
      </Button>
    </form>
  );
}
