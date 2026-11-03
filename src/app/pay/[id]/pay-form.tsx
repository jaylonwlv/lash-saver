"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";
import { ContactFields, type ContactAsk } from "./contact-fields";
import { AgreeBox, Lock } from "./ui";

export function PayForm({
  action,
  amount,
  askContact = null,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  amount: string;
  /** The pro didn't add the client's email: ask for it here. */
  askContact?: ContactAsk;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {askContact && <ContactFields ask={askContact} state={state} />}
      <AgreeBox
        defaultChecked={state.values?.agree === "on"}
        invalid={!!state.errors?.agree}
        describedBy={state.errors?.agree ? "agree-message" : undefined}
      />
      {state.errors?.agree && (
        <p id="agree-message" className="text-danger -mt-2 text-sm">
          {state.errors.agree}
        </p>
      )}
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending} className="min-h-14 text-lg">
        <Lock />
        {pending ? "Opening secure checkout…" : `Pay ${amount} deposit`}
      </Button>
      <p className="text-muted text-center text-xs">
        Card, Apple Pay or Google Pay · Secure payment by Stripe
      </p>
    </form>
  );
}
