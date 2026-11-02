"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { hoursLabel } from "@/lib/catering/bookings";
import type { FormState } from "@/lib/forms";

export type PackageValues = {
  name: string;
  description: string;
  items_text: string;
  pricing_type: string;
  price: string;
  min_guests: string;
  max_guests: string;
  included_minutes: string;
};

// Half-hour steps from 1 to 8 hours.
const LENGTHS = Array.from({ length: 15 }, (_, i) => 60 + i * 30);

export function PackageForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: PackageValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const v = { ...initial, ...state.values };
  const e = state.errors ?? {};
  const length = Number(v.included_minutes);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        id="name"
        label="Package name"
        defaultValue={v.name}
        error={e.name}
        placeholder="e.g. Taco bar"
        required
      />
      <Select
        id="pricing_type"
        label="How it's priced"
        defaultValue={v.pricing_type}
        error={e.pricing_type}
      >
        <option value="per_person">Per person</option>
        <option value="flat">Flat price</option>
      </Select>
      <Input
        id="price"
        label="Price ($)"
        inputMode="decimal"
        defaultValue={v.price}
        error={e.price}
        hint="Per guest for per-person packages."
        placeholder="18"
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="min_guests"
          label="Fewest guests"
          inputMode="numeric"
          defaultValue={v.min_guests}
          error={e.min_guests}
          placeholder="30"
          required
        />
        <Input
          id="max_guests"
          label="Most guests"
          inputMode="numeric"
          defaultValue={v.max_guests}
          error={e.max_guests}
          hint="Blank for no limit."
          placeholder="250"
        />
      </div>
      <Select
        id="included_minutes"
        label="Service time included"
        defaultValue={v.included_minutes}
        error={e.included_minutes}
        hint="Longer events add your extra-hour price (Pricing & rules)."
      >
        {LENGTHS.map((m) => (
          <option key={m} value={m}>
            {hoursLabel(m)}
          </option>
        ))}
        {!LENGTHS.includes(length) && length > 0 && (
          <option value={length}>{hoursLabel(length)}</option>
        )}
      </Select>
      <Textarea
        id="items_text"
        label="What's included (optional)"
        defaultValue={v.items_text}
        error={e.items_text}
        hint="One item per line."
        placeholder={"Choice of 2 mains\nSides and toppings"}
      />
      <Textarea
        id="description"
        label="Description (optional)"
        defaultValue={v.description}
        error={e.description}
      />
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
