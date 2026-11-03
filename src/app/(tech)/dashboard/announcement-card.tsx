"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const noSubscribe = () => () => {};
const canShareSnapshot = () => typeof navigator.share === "function";
const serverFalse = () => false;

/**
 * Something to do today, before any client has asked for a time: tell regulars that
 * deposits are coming (story, close friends, or a DM). Shown until the first pay link.
 */
export function AnnouncementCard({ message }: { message: string }) {
  const canShare = useSyncExternalStore(noSubscribe, canShareSnapshot, serverFalse);
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      await navigator.share({ text: message });
    } catch {
      // Closed the sheet or sharing was blocked: Copy is right below.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked in some in-app browsers; the text stays selectable.
    }
  }

  return (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          No booking yet? Tell your regulars 👋
        </h2>
        <p className="text-muted text-sm">
          Post this on your story or send it to your regulars, so the deposit isn&apos;t a surprise.
          When someone asks for a time, make their pay link.
        </p>
      </div>
      <p className="border-line bg-background rounded-xl border px-4 py-3 text-sm break-words whitespace-pre-line select-all">
        {message}
      </p>
      {canShare && (
        <Button type="button" onClick={share}>
          Share it
        </Button>
      )}
      <Button type="button" variant={canShare ? "secondary" : "primary"} onClick={copy}>
        {copied ? "Copied!" : "Copy message"}
      </Button>
    </section>
  );
}
