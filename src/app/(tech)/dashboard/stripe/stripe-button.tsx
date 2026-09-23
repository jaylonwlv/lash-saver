"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

/** Submits a Stripe server action; it redirects to Stripe or returns an error message. */
export function StripeButton({
  action,
  label,
  variant = "primary",
}: {
  action: () => Promise<FormState>;
  label: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction, pending] = useActionState<FormState>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? "Opening Stripe…" : label}
      </Button>
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
    </form>
  );
}
