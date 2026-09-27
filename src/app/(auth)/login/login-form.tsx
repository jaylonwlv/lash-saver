"use client";

import { useActionState, useEffect, useState } from "react";
import { trackPixel } from "@/components/meta-pixel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMagicLink, verifyCode, type LoginState } from "./actions";

export function LoginForm({ next, signUp = false }: { next?: string; signUp?: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});
  // Each send returns a new state object, so a dismissed one never hides a new send.
  const [dismissed, setDismissed] = useState<LoginState | null>(null);

  // Ad funnel steps between the landing page and a finished sign-up (no email is sent).
  useEffect(() => {
    if (signUp) trackPixel("StartSignup", { custom: true });
  }, [signUp]);
  useEffect(() => {
    if (signUp && state.sent) trackPixel("Lead");
  }, [signUp, state]);

  if (state.sent && dismissed !== state) {
    return (
      <CodeForm
        email={state.sent.email}
        next={state.sent.next}
        signUp={signUp}
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
        {pending ? "Sending…" : signUp ? "Get my code" : "Email me a sign-in code"}
      </Button>
    </form>
  );
}

function CodeForm({
  email,
  next,
  signUp,
  onChange,
}: {
  email: string;
  next: string;
  signUp: boolean;
  onChange: () => void;
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(verifyCode, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-muted">
        We emailed a code to <strong className="text-foreground">{email}</strong>. Enter it below,
        or tap the link in the email. Don&apos;t see it after a minute? Check your spam or
        promotions folder.
      </p>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <Input
        id="code"
        name="code"
        label={signUp ? "Code from the email" : "Sign-in code"}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={12}
        autoFocus
        required
        error={state.error}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : signUp ? "Continue" : "Sign in"}
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
