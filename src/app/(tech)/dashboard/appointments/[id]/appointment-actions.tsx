"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

/** A button for an appointment action, with an "are you sure?" step. */
export function ActionButton({
  action,
  label,
  confirmText,
  variant = "secondary",
}: {
  action: () => Promise<FormState>;
  label: string;
  confirmText: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction, pending] = useActionState<FormState>(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
    </form>
  );
}
