"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

export function CancelForm({
  action,
  confirmText,
  expectRefund,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  confirmText: string;
  /** What the page told the client; the server refuses to cancel on different terms. */
  expectRefund: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="expect_refund" value={expectRefund ? "1" : "0"} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Cancelling…" : "Cancel my appointment"}
      </Button>
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
    </form>
  );
}
