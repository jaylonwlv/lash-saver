"use client";

import Image, { type StaticImageData } from "next/image";
import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { APP_NAME } from "@/lib/config";
import stepAddToHomeScreen from "./images/home-screen-step-2.jpg";
import stepAdd from "./images/home-screen-step-3.jpg";

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
  const [showSteps, setShowSteps] = useState(false);

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

  const androidPrompt = where === "browser-android" ? installPrompt : null;

  return (
    <>
      <section className="bg-ink mb-6 flex flex-col gap-3 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="bg-pink text-ink flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl font-bold"
          >
            +
          </span>
          <div className="flex flex-col">
            <p className="text-lg leading-tight font-bold">Add {APP_NAME} to your Home Screen</p>
            <p className="text-sm text-white/80">One tap to open, and you stay signed in.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (androidPrompt) {
              await androidPrompt.prompt();
              setInstallPrompt(null);
            } else setShowSteps(true);
          }}
          className="bg-pink text-ink inline-flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold"
        >
          {androidPrompt ? "Add to Home Screen" : "Show me how"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-11 items-center justify-center text-sm text-white/70 underline"
        >
          Not now
        </button>
      </section>
      {showSteps && (
        <HomeScreenSteps ios={where === "browser-ios"} onClose={() => setShowSteps(false)} />
      )}
    </>
  );
}

/** A short how-to sheet, with screenshots of each step on iPhone. */
function HomeScreenSteps({ ios, onClose }: { ios: boolean; onClose: () => void }) {
  const steps: { text: ReactNode; image?: StaticImageData; alt?: string }[] = ios
    ? [
        {
          text: (
            <>
              Tap <strong>Share</strong> in Safari (the square with an arrow). If you don&apos;t see
              it, tap <strong>•••</strong> first.
            </>
          ),
        },
        {
          text: (
            <>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </>
          ),
          image: stepAddToHomeScreen,
          alt: "Safari's share menu with Add to Home Screen at the bottom",
        },
        {
          text: (
            <>
              Keep <strong>Open as Web App</strong> on, then tap <strong>Add</strong>.
            </>
          ),
          image: stepAdd,
          alt: `The Add to Home Screen screen with the ${APP_NAME} icon, Open as Web App switched on and the Add button`,
        },
      ]
    : [
        {
          text: (
            <>
              Tap <strong>⋮</strong> at the top right of Chrome.
            </>
          ),
        },
        {
          text: (
            <>
              Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>).
            </>
          ),
        },
        {
          text: (
            <>
              Tap <strong>Install</strong> or <strong>Add</strong>.
            </>
          ),
        },
      ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add ${APP_NAME} to your Home Screen`}
      className="fixed inset-0 z-30 flex items-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-surface mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Add {APP_NAME} to your Home Screen</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted flex size-11 shrink-0 items-center justify-center text-2xl"
          >
            ×
          </button>
        </div>
        <ol className="flex flex-col gap-5">
          {steps.map((step, i) => (
            <li key={i} className="flex flex-col gap-3">
              <div className="flex gap-3">
                <span className="bg-brand text-brand-foreground flex size-8 shrink-0 items-center justify-center rounded-full font-bold">
                  {i + 1}
                </span>
                <p className="pt-1">{step.text}</p>
              </div>
              {step.image && (
                <Image
                  src={step.image}
                  alt={step.alt ?? ""}
                  sizes="(min-width: 512px) 470px, 90vw"
                  placeholder="blur"
                  className="border-line h-auto w-full rounded-2xl border"
                />
              )}
            </li>
          ))}
        </ol>
        <p className="text-muted text-sm">
          Then open {APP_NAME} from your Home Screen and sign in once. You&apos;ll stay signed in
          after that.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="bg-brand text-brand-foreground inline-flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
