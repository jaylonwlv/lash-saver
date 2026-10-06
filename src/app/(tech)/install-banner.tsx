"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { APP_NAME } from "@/lib/config";

/*
 * Pros sign up from Instagram ads, inside Instagram's in-app browser. Its
 * sign-in doesn't carry over to Safari or Chrome, and they can't get back to it
 * once they leave, so they'd have to sign in again every time. This banner moves
 * them to their real browser, then suggests adding Dibs to the Home Screen,
 * where it stays signed in. It disappears once Dibs runs from the Home Screen.
 */

type Where =
  | "instagram-ios"
  | "instagram-android"
  | "browser-ios"
  | "browser-android"
  | "installed"
  | "desktop";

function whereSnapshot(): Where {
  const ua = navigator.userAgent;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true);
  if (standalone) return "installed";
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const android = /Android/i.test(ua);
  // Instagram's and Facebook's in-app browsers.
  if (/Instagram|FBAN|FBAV|FB_IAB/i.test(ua)) {
    if (ios) return "instagram-ios";
    if (android) return "instagram-android";
  }
  if (ios) return "browser-ios";
  if (android) return "browser-android";
  return "desktop";
}

const noSubscribe = () => () => {};
const serverNull = () => null;

const DISMISS_KEY = "dibs:home-screen-tip-dismissed";
const DISMISS_DAYS = 14;

function dismissedSnapshot(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/** Chrome's install prompt event (not in the DOM types). */
type InstallPromptEvent = Event & { prompt: () => Promise<void> };

export function InstallBanner() {
  const where = useSyncExternalStore(noSubscribe, whereSnapshot, serverNull);
  const dismissedBefore = useSyncExternalStore(noSubscribe, dismissedSnapshot, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!where || where === "installed" || where === "desktop") return null;

  // Inside Instagram: always shown (it's why they keep getting signed out), but compact.
  if (where === "instagram-ios" || where === "instagram-android") {
    return (
      <section className="bg-ink mb-6 flex flex-col gap-2 rounded-2xl p-4 text-sm text-white">
        <p className="text-pink text-xs font-semibold tracking-wide uppercase">Stay signed in</p>
        <p className="font-semibold">
          You&apos;re in Instagram&apos;s browser, which won&apos;t keep you signed in once you
          leave.
        </p>
        {where === "instagram-ios" ? (
          <p className="text-white/80">
            Tap <strong className="text-white">•••</strong> at the top, then{" "}
            <strong className="text-white">Open in external browser</strong>. Sign in once in
            Safari, then add {APP_NAME} to your Home Screen. Everything you set up here is saved.
          </p>
        ) : (
          <>
            <p className="text-white/80">
              Open {APP_NAME} in Chrome and sign in once. Everything you set up here is saved.
            </p>
            <a
              href={`intent://${window.location.host}/dashboard#Intent;scheme=https;package=com.android.chrome;end`}
              className="bg-pink text-ink mt-1 inline-flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold"
            >
              Open in Chrome
            </a>
          </>
        )}
      </section>
    );
  }

  if (dismissed || dismissedBefore) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setDismissed(true);
  };

  return (
    <section className="border-line bg-surface mb-6 flex flex-col gap-2 rounded-2xl border p-4 text-sm">
      <p className="font-semibold">Add {APP_NAME} to your Home Screen</p>
      <p className="text-muted">
        Open it in one tap, full screen, and stay signed in.{" "}
        {where === "browser-ios"
          ? "Tap Share (the square with an arrow), then Add to Home Screen."
          : installPrompt
            ? ""
            : "Tap ⋮ at the top, then Add to Home screen."}
      </p>
      <div className="flex gap-3">
        {where === "browser-android" && installPrompt && (
          <button
            type="button"
            onClick={async () => {
              await installPrompt.prompt();
              setInstallPrompt(null);
            }}
            className="bg-brand text-brand-foreground inline-flex min-h-12 flex-1 items-center justify-center rounded-xl px-4 font-semibold"
          >
            Add to Home Screen
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="text-muted inline-flex min-h-12 items-center px-2 font-medium underline"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
