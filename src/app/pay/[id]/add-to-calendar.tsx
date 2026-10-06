"use client";

import { useSyncExternalStore } from "react";
import { isInAppBrowser } from "@/lib/in-app-browser";

const noSubscribe = () => () => {};

/**
 * Saves the booking in the client's own calendar, with a phone alert before it.
 * People forget appointments that aren't in their calendar.
 */
export function AddToCalendar({ href }: { href: string }) {
  const inApp = useSyncExternalStore(
    noSubscribe,
    () => isInAppBrowser(navigator.userAgent),
    () => false,
  );
  return (
    <div className="flex flex-col gap-2">
      <a
        href={href}
        className="border-line bg-surface active:bg-background inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 font-semibold"
      >
        <span aria-hidden>📅</span> Add to my calendar
      </a>
      {inApp && (
        <p className="text-muted text-sm">
          Nothing happening? Instagram&apos;s browser can&apos;t open calendars. Tap{" "}
          <strong className="text-foreground">•••</strong> at the top, then{" "}
          <strong className="text-foreground">Open in external browser</strong>, or use the invite
          in your confirmation email.
        </p>
      )}
    </div>
  );
}
