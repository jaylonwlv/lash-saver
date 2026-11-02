"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

export function PayButton({
  action,
  label,
}: {
  action: (prev: FormState) => Promise<FormState>;
  label: string;
}) {
  const [state, formAction, pending] = useActionState<FormState>(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "One sec…" : label}
      </Button>
    </form>
  );
}
