"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

export function PayForm({
  action,
  amount,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  amount: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex min-h-12 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="agree"
          className="accent-brand mt-0.5 size-6 shrink-0"
          aria-invalid={state.errors?.agree ? true : undefined}
          aria-describedby={state.errors?.agree ? "agree-message" : undefined}
        />
        <span>I&apos;ve read and agree to the deposit policy above.</span>
      </label>
      {state.errors?.agree && (
        <p id="agree-message" className="text-danger -mt-2 text-sm">
          {state.errors.agree}
        </p>
      )}
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Opening secure checkout…" : `Pay ${amount} deposit`}
      </Button>
      <p className="text-muted text-center text-xs">Secure payment by Stripe.</p>
    </form>
  );
}
