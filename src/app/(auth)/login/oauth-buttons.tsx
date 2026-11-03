"use client";

import { useState, useSyncExternalStore } from "react";
import { isInAppBrowser } from "@/lib/in-app-browser";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "apple";

const noSubscribe = () => () => {};
// Google refuses sign-in inside Instagram's browser, and Apple's web sign-in asks
// for a password there, so these only show in a real browser (the email code
// works everywhere).
const realBrowserSnapshot = () => !isInAppBrowser(navigator.userAgent);

/** "Continue with Apple / Google": one tap, no email code. Lands on /auth/callback. */
export function OAuthButtons({ providers, next }: { providers: Provider[]; next?: string }) {
  const realBrowser = useSyncExternalStore(noSubscribe, realBrowserSnapshot, () => false);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!realBrowser || providers.length === 0) return null;

  async function signIn(provider: Provider) {
    setBusy(provider);
    setError(null);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next || "/dashboard");
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });
    if (error) {
      console.error(`Sign in with ${provider} failed`, error);
      setError("That didn't work. Try again, or use your email below.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {(["apple", "google"] as const)
        .filter((p) => providers.includes(p))
        .map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => signIn(p)}
            disabled={busy !== null}
            className={`press inline-flex min-h-13 items-center justify-center gap-3 rounded-2xl px-5 text-base font-semibold disabled:opacity-60 ${
              p === "apple"
                ? "bg-white text-black"
                : "border border-white/25 bg-transparent text-white"
            }`}
          >
            {p === "apple" ? <AppleMark /> : <GoogleMark />}
            {busy === p ? "Opening…" : `Continue with ${p === "apple" ? "Apple" : "Google"}`}
          </button>
        ))}
      {error && <p className="text-danger text-sm">{error}</p>}
      <div className="text-muted flex items-center gap-3 text-xs">
        <span className="h-px flex-1 bg-white/15" />
        or use your email
        <span className="h-px flex-1 bg-white/15" />
      </div>
    </div>
  );
}

// The providers' own marks, as their sign-in guidelines ask.
function AppleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.77-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.97.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 5.84c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.09 1.75-.96 2.79 1.02.08 2.05-.52 2.68-1.27z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.26-.97 2.33-2.06 3.05l3.33 2.58c1.94-1.79 3.06-4.42 3.06-7.55 0-.72-.06-1.42-.19-2.09H12z"
      />
      <path
        fill="#34A853"
        d="M5.84 14.29l-.75.57-2.66 2.07C4.1 20.27 7.78 22.5 12 22.5c2.84 0 5.22-.94 6.96-2.55l-3.33-2.58c-.92.62-2.1.99-3.63.99-2.79 0-5.15-1.88-6-4.42l-.16.35z"
      />
      <path
        fill="#4A90E2"
        d="M2.43 7.07A10.43 10.43 0 0 0 1.5 12c0 1.77.42 3.44 1.17 4.93l3.17-2.46A6.3 6.3 0 0 1 5.5 12c0-.86.15-1.69.42-2.47L2.43 7.07z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.58c1.55 0 2.94.53 4.03 1.58l2.98-2.98C17.21 2.5 14.84 1.5 12 1.5 7.78 1.5 4.1 3.73 2.43 7.07l3.49 2.46C6.85 7.46 9.21 5.58 12 5.58z"
      />
    </svg>
  );
}
