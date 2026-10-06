"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { changeUnconfirmedEmail } from "./actions";

/**
 * For pros who signed up instantly (/start) and haven't signed in with a code yet:
 * shows where booking alerts go, so a mistyped email gets caught without a trip to
 * their inbox. Nothing waits on it; their first code sign-in confirms the email.
 */
export function AlertsEmail({ email }: { email: string }) {
  const [changing, setChanging] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await changeUnconfirmedEmail(prev, formData);
    if (!result.errors && !result.message) setChanging(false);
    return result;
  }, {});

  if (!changing) {
    return (
      <div className="-my-2 flex flex-wrap items-center gap-x-2 text-sm">
        <p className="text-muted">
          Booking alerts go to{" "}
          <strong className="text-foreground [overflow-wrap:anywhere]">{email}</strong>
        </p>
        <button
          type="button"
          onClick={() => setChanging(true)}
          className="text-brand inline-flex min-h-11 items-center font-medium underline"
        >
          Wrong? Fix it
        </button>
      </div>
    );
  }
  return (
    <form
      action={action}
      className="bg-surface flex flex-col gap-3 rounded-[22px] p-5 shadow-[0_1px_0_var(--line)]"
    >
      <Input
        id="email"
        type="email"
        label="Your email"
        hint="Where booking alerts go, and how you sign in on another phone."
        autoComplete="email"
        inputMode="email"
        defaultValue={state.values?.email ?? email}
        error={state.errors?.email}
        required
      />
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save email"}
      </Button>
      <button
        type="button"
        onClick={() => setChanging(false)}
        className="text-muted min-h-11 text-sm underline"
      >
        Cancel
      </button>
    </form>
  );
}
