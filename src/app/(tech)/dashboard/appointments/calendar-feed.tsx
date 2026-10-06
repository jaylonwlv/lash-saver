"use client";

import { useActionState, useSyncExternalStore } from "react";
import type { FormState } from "@/lib/forms";
import { isInAppBrowser } from "@/lib/in-app-browser";

const noSubscribe = () => () => {};
type Where = "in-app" | "android" | "other";
function whereSnapshot(): Where {
  const ua = navigator.userAgent;
  if (isInAppBrowser(ua)) return "in-app";
  return /Android/i.test(ua) ? "android" : "other";
}

/**
 * Subscribe the phone's own calendar to this pro's appointments. Apple Calendar
 * opens webcal:// links with a "Subscribe" prompt; Google takes the same feed by URL.
 */
export function CalendarFeed({
  feedUrl,
  reset,
}: {
  feedUrl: string;
  reset: () => Promise<FormState>;
}) {
  const where = useSyncExternalStore(noSubscribe, whereSnapshot, () => "other" as const);
  const [state, resetAction, resetting] = useActionState<FormState>(reset, {});
  const webcal = feedUrl.replace(/^https?:\/\//, "webcal://");
  const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
  const buttons = [
    { href: webcal, label: "Apple Calendar" },
    { href: google, label: "Google Calendar" },
  ];
  if (where === "android") buttons.reverse();

  return (
    <section className="border-line bg-surface flex flex-col gap-3 rounded-2xl border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">See these in your calendar</h2>
        <p className="text-muted text-sm">
          Your appointments show up in your phone&apos;s calendar next to everything else, and
          update on their own (usually within the hour; Google can take up to a day). Pay links
          still waiting show as &ldquo;Waiting for deposit&rdquo;.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {buttons.map((b) => (
          <a
            key={b.label}
            href={b.href}
            target={b.label === "Google Calendar" ? "_blank" : undefined}
            rel="noreferrer"
            className="border-line bg-background inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 font-semibold"
          >
            <span aria-hidden>📅</span> Add to {b.label}
          </a>
        ))}
      </div>
      {where === "in-app" && (
        <p className="text-muted text-sm">
          Instagram&apos;s browser can&apos;t open your calendar. Open this page in Safari or Chrome
          first.
        </p>
      )}
      <form action={resetAction} className="flex flex-col gap-1">
        <p className="text-muted text-xs">
          The link is private: anyone who has it can see your appointments.{" "}
          <button
            type="submit"
            disabled={resetting}
            onClick={(event) => {
              if (!window.confirm("Make a new link? Calendars using the old one stop updating."))
                event.preventDefault();
            }}
            className="text-brand inline-flex min-h-11 items-center font-medium underline"
          >
            {resetting ? "Resetting…" : "Reset link"}
          </button>
        </p>
        {state.message && <p className="text-sm">{state.message}</p>}
      </form>
    </section>
  );
}
