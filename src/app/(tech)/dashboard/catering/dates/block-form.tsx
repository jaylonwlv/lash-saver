"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { blockDate } from "../actions";

export function BlockForm({ min }: { min: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(blockDate, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <Input
        id="date"
        type="date"
        label="Date"
        min={min}
        defaultValue={v.date}
        error={e.date}
        required
      />
      <Input
        id="reason"
        label="Note (only you see it)"
        defaultValue={v.reason}
        error={e.reason}
        placeholder="e.g. Festival"
      />
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Block this date"}
      </Button>
    </form>
  );
}
