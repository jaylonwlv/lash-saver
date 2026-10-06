"use client";

import { useActionState, useState } from "react";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { changeUnconfirmedEmail } from "./actions";

/**
 * Shown before the first pay link to pros who signed up instantly (/start):
 * a code to the email they gave proves it's theirs, so booking alerts reach them
 * and they can sign in on another phone or browser.
 */
export function ConfirmEmail({ email, next }: { email: string; next: string }) {
  const [changing, setChanging] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await changeUnconfirmedEmail(prev, formData);
    if (!result.errors && !result.message) setChanging(false);
    return result;
  }, {});

  return (
    <section className="border-brand bg-surface flex flex-col gap-4 rounded-2xl border-2 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">Confirm your email to send pay links</h2>
        <p className="text-muted text-sm">
          We&apos;ll email a code to <strong className="text-foreground">{email}</strong>. It also
          lets you sign in on any phone, and it&apos;s where your booking alerts go.
        </p>
      </div>
      {changing ? (
        <form action={action} className="flex flex-col gap-3">
          <Input
            id="email"
            type="email"
            label="Your email"
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
      ) : (
        <>
          {/* Keyed by email so a corrected address starts a fresh code. */}
          <LoginForm key={email} next={next} fixedEmail={email} />
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="text-brand min-h-11 text-sm font-medium underline"
          >
            Wrong email? Change it
          </button>
        </>
      )}
    </section>
  );
}
