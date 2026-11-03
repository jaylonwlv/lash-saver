"use client";

import { useState } from "react";
import { createHandoffLink } from "./handoff-actions";

/**
 * "Open in Safari / Chrome" from Instagram's browser, already signed in. Chrome
 * opens through an Android intent; Safari through Apple's x-safari-https link,
 * which some versions of Instagram ignore, so if the page is still here a moment
 * later it offers the link to copy and paste into Safari instead.
 */
export function OpenInBrowser({ ios }: { ios: boolean }) {
  const [state, setState] = useState<"idle" | "working" | "fallback" | "failed">("idle");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function open() {
    setState("working");
    const url = await createHandoffLink();
    if (!url) {
      setState("failed");
      return;
    }
    setLink(url);
    const target = new URL(url);
    window.location.href = ios
      ? `x-safari-${url}`
      : `intent://${target.host}${target.pathname}${target.search}#Intent;scheme=https;package=com.android.chrome;end`;
    // Still here: the app didn't hand it over. Offer the link instead.
    window.setTimeout(() => {
      if (document.visibilityState === "visible") setState("fallback");
    }, 1500);
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={open}
        disabled={state === "working"}
        className="press bg-pink text-ink mt-1 inline-flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold disabled:opacity-60"
      >
        {state === "working" ? "Opening…" : ios ? "Open in Safari" : "Open in Chrome"}
      </button>
      {state === "fallback" && link && (
        <div className="flex flex-col gap-2 rounded-xl bg-white/10 p-3">
          <p className="text-white/85">
            Instagram didn&apos;t let it open. Copy this sign-in link, then paste it into{" "}
            {ios ? "Safari" : "Chrome"}&apos;s address bar. It works once, so don&apos;t share it.
          </p>
          <input
            id="handoff-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 w-full rounded-lg bg-black/40 px-3 text-base text-white/80"
          />
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white font-semibold text-black"
          >
            {copied ? "Copied" : "Copy sign-in link"}
          </button>
        </div>
      )}
      {state === "failed" && (
        <p className="text-white/80">
          Couldn&apos;t make a sign-in link. Open {ios ? "Safari" : "Chrome"} and sign in with your
          email instead.
        </p>
      )}
    </div>
  );
}
