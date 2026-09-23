"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { createAppointment } from "../actions";

export type ServiceOption = { id: string; label: string };

export function AppointmentForm({
  services,
  today,
  timeZoneLabel,
}: {
  services: ServiceOption[];
  today: string;
  timeZoneLabel: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createAppointment, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5">
      <Select
        id="service_id"
        label="Service"
        defaultValue={v.service_id ?? services[0]?.id}
        error={e.service_id}
      >
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </Select>
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
