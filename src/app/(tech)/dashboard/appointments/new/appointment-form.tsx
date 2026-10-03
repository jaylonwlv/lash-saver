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

/** A returning client and their record, from lib/clients. */
export type ClientOption = {
  key: string;
  name: string;
  email: string | null;
  instagram: string | null;
  phone: string | null;
  record: string;
  missed: number;
};

const sameEmail = (a: string | null, b: string) => !!a && a === b.trim().toLowerCase();
const sameHandle = (a: string | null, b: string) =>
  !!a && !!b.trim() && a.toLowerCase() === b.trim().replace(/^@/, "").toLowerCase();

export function AppointmentForm({
  services,
  today,
  timeZoneLabel,
  cardFees,
  clients,
  initialClientKey,
}: {
  services: ServiceOption[];
  clients: ClientOption[];
  /** From a client's page ("New appointment for …"): start with their details. */
  initialClientKey?: string;
  today: string;
  timeZoneLabel: string;
  /** Deposits go through Stripe, so show what the pro receives after the card fee. */
  cardFees: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createAppointment, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  // Client details are controlled so picking a returning client can fill them in.
  const initial = clients.find((c) => c.key === initialClientKey);
  const [picked, setPicked] = useState(initial?.key ?? "");
  const [name, setName] = useState(v.client_name ?? initial?.name ?? "");
  const [email, setEmail] = useState(v.client_email ?? initial?.email ?? "");
  const [instagram, setInstagram] = useState(
    v.client_instagram ?? (initial?.instagram ? `@${initial.instagram}` : ""),
  );
  const [phone, setPhone] = useState(v.client_phone ?? initial?.phone ?? "");
  // Their record, whether picked from the list or typed in by hand.
  const match =
    clients.find((c) => c.key === picked) ??
    clients.find((c) => sameEmail(c.email, email) || sameHandle(c.instagram, instagram));

  function pick(key: string) {
    setPicked(key);
    const c = clients.find((x) => x.key === key);
    setName(c?.name ?? "");
    setEmail(c?.email ?? "");
    setInstagram(c?.instagram ? `@${c.instagram}` : "");
    setPhone(c?.phone ?? "");
  }

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
      {clients.length > 0 && (
        <Select
          id="client_pick"
          label="Client"
          value={picked}
          onChange={(event) => pick(event.target.value)}
          hint="Pick a returning client to fill in their details, or add someone new."
        >
          <option value="">New client</option>
          {clients.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
              {c.missed ? ` · ${c.missed} missed` : c.email ? ` · ${c.email}` : ""}
            </option>
          ))}
        </Select>
      )}
      <Input
        id="client_name"
        label="Client name"
        autoComplete="off"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={e.client_name}
        required
      />
      <Input
        id="client_email"
        label="Client email"
        type="email"
        inputMode="email"
        autoComplete="off"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
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
        value={instagram}
        onChange={(event) => setInstagram(event.target.value)}
        error={e.client_instagram}
      />
      <Input
        id="client_phone"
        label="Client phone (optional)"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        error={e.client_phone}
      />
      {match &&
        (match.missed > 0 ? (
          <p className="border-danger bg-surface rounded-2xl border p-4 text-sm" role="status">
            <strong>
              Heads up: {match.name} has missed {match.missed} appointment
              {match.missed === 1 ? "" : "s"}
            </strong>{" "}
            ({match.record}). Consider a bigger deposit below, or the full price up front.
          </p>
        ) : (
          <p className="border-line bg-surface text-muted rounded-2xl border p-4 text-sm">
            Returning client: {match.name} · {match.record}
          </p>
        ))}
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
