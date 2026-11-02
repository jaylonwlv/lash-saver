"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

/** "Cancel my event", with a confirm step that states the refund first. */
export function CancelEvent({
  action,
  summary,
}: {
  action: (prev: FormState) => Promise<FormState>;
  summary: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState>(action, {});
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-danger min-h-11 self-start text-sm font-medium"
      >
        Cancel my event
      </button>
    );
  return (
    <form
      action={formAction}
      className="border-danger flex flex-col gap-3 rounded-2xl border-2 p-4"
    >
      <p className="text-sm font-medium">{summary}</p>
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Cancelling…" : "Yes, cancel my event"}
      </Button>
      <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
        Keep my event
      </Button>
    </form>
  );
}
