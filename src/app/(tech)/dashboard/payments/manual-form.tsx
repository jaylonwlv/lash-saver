"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { saveManualPayments } from "./actions";

export function ManualPaymentsForm({
  initial,
  active,
}: {
  initial: { cashapp_tag: string; zelle_contact: string; venmo_handle: string };
  active: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveManualPayments, {});
  const v = { ...initial, ...state.values };
  const e = state.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <Input
        id="cashapp_tag"
        label="Cash App"
        placeholder="$YourCashtag"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        defaultValue={v.cashapp_tag}
        error={e.cashapp_tag}
      />
      <Input
        id="zelle_contact"
        label="Zelle (email or phone)"
        placeholder="you@email.com"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        defaultValue={v.zelle_contact}
        error={e.zelle_contact}
      />
      <Input
        id="venmo_handle"
        label="Venmo"
        placeholder="@your-username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        defaultValue={v.venmo_handle}
        error={e.venmo_handle}
      />
      <p className="text-muted text-sm">
        Fill in any you use. Clients see them on their pay link, send the deposit in their app, then
        you tap <strong>Received</strong>. Dibs charges no fee on these.
      </p>
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : active ? "Save" : "Use Cash App, Zelle or Venmo"}
      </Button>
    </form>
  );
}
