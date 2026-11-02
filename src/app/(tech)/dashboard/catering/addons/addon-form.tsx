"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";

export type AddOnValues = {
  name: string;
  description: string;
  pricing_type: string;
  price: string;
};

export function AddOnForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: AddOnValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const v = { ...initial, ...state.values };
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        id="name"
        label="Add-on name"
        defaultValue={v.name}
        error={e.name}
        placeholder="e.g. Drinks"
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
        placeholder="3"
        required
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
