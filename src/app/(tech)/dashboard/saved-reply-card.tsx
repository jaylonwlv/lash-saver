"use client";

import { useState, useSyncExternalStore } from "react";
import { CopyLink } from "@/components/ui/copy-link";
import { APP_NAME } from "@/lib/config";

/*
 * Bookings start in a DM ("can I get Saturday?"), and that's the moment a pro can
 * send a pay link, not when one of our emails arrives. An Instagram saved reply
 * puts a prompt in that moment: they type "dibs" in the chat, and the message
 * reminds them (and the client) that a pay link is next.
 */

const SHORTCUT = "dibs";
const MESSAGE =
  "Thanks! To lock in your spot I take a deposit that goes toward your appointment. Sending you the link now 🙏";
const DONE_KEY = "dibs:saved-reply-done";

const noSubscribe = () => () => {};
function doneSnapshot(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function SavedReplyCard() {
  // Hidden until the page is running, so a pro who finished this never sees it flash.
  const doneBefore = useSyncExternalStore(noSubscribe, doneSnapshot, () => true);
  const [done, setDone] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  if (doneBefore || done) return null;

  return (
    <section className="border-ink bg-surface flex flex-col gap-4 rounded-[22px] border-2 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-brand text-xs font-semibold tracking-wide uppercase">1-minute setup</p>
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          Add {APP_NAME} to your DMs
        </h2>
        <p className="text-muted text-sm">
          Save this as an Instagram quick reply. When a client asks for a time, type{" "}
          <strong className="text-foreground">{SHORTCUT}</strong> in the chat, send it, then tap New
          appointment here and share the pay link.
        </p>
      </div>
      <CopyLink url={MESSAGE} label="Copy the message" prose tinted />
      {showSteps ? (
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>
            In Instagram, go to <strong>Settings</strong> → <strong>Business tools</strong> (or{" "}
            <strong>Creator tools</strong>) → <strong>Saved replies</strong>.
          </li>
          <li>
            Tap <strong>+</strong>, paste the message, and set the shortcut to{" "}
            <strong>{SHORTCUT}</strong>.
          </li>
          <li>
            In a client&apos;s chat, type <strong>{SHORTCUT}</strong> and tap the saved reply.
          </li>
          <li className="text-muted list-none">
            Saved replies need a business or creator account; switching is free in Instagram&apos;s
            settings.
          </li>
        </ol>
      ) : (
        <button
          type="button"
          onClick={() => setShowSteps(true)}
          className="text-brand inline-flex min-h-11 items-center self-start text-sm font-medium underline"
        >
          How to save it in Instagram
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(DONE_KEY, "1");
          } catch {}
          setDone(true);
        }}
        className="border-line bg-background inline-flex min-h-12 items-center justify-center rounded-xl border px-4 font-semibold"
      >
        Done, it&apos;s saved
      </button>
    </section>
  );
}
