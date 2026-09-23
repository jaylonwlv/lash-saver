"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMagicLink, verifyCode, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});
  // Each send returns a new state object, so a dismissed one never hides a new send.
  const [dismissed, setDismissed] = useState<LoginState | null>(null);

  if (state.sent && dismissed !== state) {
    return (
      <CodeForm
        email={state.sent.email}
        next={state.sent.next}
        onChange={() => setDismissed(state)}
      />
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        inputMode="email"
        defaultValue={state.sent?.email}
        required
      />
      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in code"}
      </Button>
    </form>
  );
}

function CodeForm({
  email,
  next,
  onChange,
}: {
  email: string;
  next: string;
  onChange: () => void;
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(verifyCode, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-muted">
        We emailed a code to <strong className="text-foreground">{email}</strong>. Enter it below,
        or tap the link in the email.
      </p>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <Input
        id="code"
        name="code"
        label="Sign-in code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={12}
        autoFocus
        required
        error={state.error}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <button
        type="button"
        onClick={onChange}
        className="text-brand min-h-12 text-sm font-medium underline"
      >
        Use a different email or send a new code
      </button>
    </form>
  );
}
