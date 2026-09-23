"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

/** A button that runs a billing action (redirects to Stripe) and shows errors. */
export function BillingButton({
  action,
  label,
  pendingLabel = "Opening Stripe…",
  variant = "primary",
}: {
  action: () => Promise<FormState>;
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction, pending] = useActionState<FormState>(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
    </form>
  );
}
