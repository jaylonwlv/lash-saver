"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMagicLink, verifyCode, type LoginState } from "./actions";
import { deviceFromUserAgent, inboxLinks } from "./inbox";

type Sent = NonNullable<LoginState["sent"]>;

/*
 * The code screen is remembered for a while, because switching to the email app
 * can make Instagram's in-app browser reload the page. Without this the pro
 * lands back on the email screen, asks for a new code, and the one they just
 * read stops working.
 */
const SENT_KEY = "dibs:login-sent";
const SENT_TTL_MS = 60 * 60 * 1000; // Supabase codes last an hour

function saveSent(sent: Sent | null) {
  try {
    if (sent) localStorage.setItem(SENT_KEY, JSON.stringify({ ...sent, at: Date.now() }));
    else localStorage.removeItem(SENT_KEY);
  } catch {}
}

/** The saved JSON while it's fresh, else null. A string, so React sees a stable snapshot. */
function savedSentSnapshot(): string | null {
  try {
    const raw = localStorage.getItem(SENT_KEY);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (typeof v === "object" && v !== null && "at" in v && typeof v.at === "number") {
      if (Date.now() - v.at < SENT_TTL_MS) return raw;
    }
    localStorage.removeItem(SENT_KEY);
  } catch {}
  return null;
}

function parseSent(raw: string | null): Sent | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (
      typeof v === "object" &&
      v !== null &&
      "email" in v &&
      "next" in v &&
      typeof v.email === "string" &&
      typeof v.next === "string"
    ) {
      return { email: v.email, next: v.next };
    }
  } catch {}
  return null;
}

// Browser-only values read during render; the server (and hydration) sees null.
const noSubscribe = () => () => {};
const serverNull = () => null;
const deviceSnapshot = () => deviceFromUserAgent(navigator.userAgent);

export function LoginForm({
  next,
  fixedEmail,
}: {
  next?: string;
  /** Send the code to this address without asking (confirming a signed-in pro's email). */
  fixedEmail?: string;
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});
  // Each send returns a new state object, so a dismissed one never hides a new send.
  const [dismissed, setDismissed] = useState<LoginState | null>(null);
  // A code screen from before a reload (see SENT_KEY), for the same destination only.
  const saved = parseSent(useSyncExternalStore(noSubscribe, savedSentSnapshot, serverNull));
  const [restoreDismissed, setRestoreDismissed] = useState(false);
  // Kept once its code is submitted, since submitting clears the saved copy.
  const [pinned, setPinned] = useState<Sent | null>(null);
  const restored = restoreDismissed
    ? null
    : (pinned ??
      (saved && saved.next === (next || "/dashboard") && (!fixedEmail || saved.email === fixedEmail)
        ? saved
        : null));
  useEffect(() => {
    if (state.sent) saveSent(state.sent);
  }, [state]);

  if (state.sent && dismissed !== state) {
    return (
      <CodeForm
        email={state.sent.email}
        next={state.sent.next}
        onChange={() => {
          saveSent(null);
          setDismissed(state);
        }}
      />
    );
  }

  if (restored && !state.sent) {
    return (
      <CodeForm
        email={restored.email}
        next={restored.next}
        onSubmit={() => setPinned(restored)}
        onChange={() => {
          saveSent(null);
          setRestoreDismissed(true);
        }}
      />
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      {fixedEmail ? (
        <input type="hidden" name="email" value={fixedEmail} />
      ) : (
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.sent?.email}
          autoFocus
          required
        />
      )}
      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : fixedEmail ? "Email me a code" : "Email me a sign-in code"}
      </Button>
    </form>
  );
}

export function CodeForm({
  email,
  next,
  onSubmit,
  onChange,
}: {
  email: string;
  next: string;
  onSubmit?: () => void;
  onChange: () => void;
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(verifyCode, {});
  // The server can't see the phone, so the buttons appear once the page is running.
  const device = useSyncExternalStore(noSubscribe, deviceSnapshot, serverNull);
  const inbox = device ? inboxLinks(email, device) : [];
  // Forget the screen once a code is submitted (success redirects away); bring it back if it failed.
  useEffect(() => {
    if (state.error) saveSent({ email, next });
  }, [state, email, next]);

  return (
    <form
      action={action}
      onSubmit={() => {
        onSubmit?.();
        saveSent(null);
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-muted">
        We emailed a code to <strong className="text-foreground">{email}</strong>. Enter it below,
        or tap the link in the email. Don&apos;t see it after a minute? Check your spam or
        promotions folder.
      </p>
      {inbox.length > 0 && (
        <div className="flex gap-3">
          {inbox.map((link) => (
            <a
              key={link.href}
              href={link.href}
              {...(link.href.startsWith("https:") ? { target: "_blank", rel: "noreferrer" } : {})}
              className="border-line bg-surface text-foreground active:bg-background inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border px-4 font-semibold"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <Input
        id="code"
        name="code"
        label="Code from the email"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={12}
        autoFocus
        required
        error={state.error}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Continue"}
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
