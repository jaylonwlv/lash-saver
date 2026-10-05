"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

// The phone's share sheet (Instagram, iMessage, WhatsApp…); missing on most desktops.
const noSubscribe = () => () => {};
const canShareSnapshot = () => typeof navigator.share === "function";
const serverFalse = () => false;

/**
 * Sends the pay link with a ready-made message: one tap opens the share sheet,
 * where the pro picks Instagram and the client's chat. Copying stays as a fallback
 * (and is the main button where there's no share sheet).
 */
export function SharePayLink({ url, message }: { url: string; message: string }) {
  const canShare = useSyncExternalStore(noSubscribe, canShareSnapshot, serverFalse);
  const [copied, setCopied] = useState<"message" | "link" | null>(null);

  async function share() {
    try {
      await navigator.share({ text: message });
    } catch {
      // Closed the sheet, or sharing was blocked: the copy buttons are right below.
    }
  }

  async function copy(what: "message" | "link") {
    try {
      await navigator.clipboard.writeText(what === "message" ? message : url);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard can be blocked (e.g. some in-app browsers); the message stays selectable.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="border-line bg-background rounded-xl border px-4 py-3 text-sm break-words whitespace-pre-line select-all">
        {message}
      </p>
      {canShare && (
        <Button type="button" onClick={share}>
          Share pay link
        </Button>
      )}
      <Button
        type="button"
        variant={canShare ? "secondary" : "primary"}
        onClick={() => copy("message")}
      >
        {copied === "message" ? "Copied!" : "Copy message"}
      </Button>
      <button
        type="button"
        onClick={() => copy("link")}
        className="text-brand min-h-12 text-sm font-medium underline"
      >
        {copied === "link" ? "Link copied!" : "Copy the link only"}
      </button>
    </div>
  );
}
