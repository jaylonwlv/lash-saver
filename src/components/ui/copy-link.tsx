"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Shows a link with a copy button, for pasting into an Instagram DM. */
export function CopyLink({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (e.g. some in-app browsers); the link stays selectable.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="border-line bg-background rounded-xl border px-4 py-3 text-sm break-all select-all">
        {url}
      </p>
      <Button type="button" onClick={copy}>
        {copied ? "Copied!" : label}
      </Button>
    </div>
  );
}
