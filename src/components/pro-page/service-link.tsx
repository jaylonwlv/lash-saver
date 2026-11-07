"use client";

import type { ReactNode } from "react";

/**
 * A service on the menu: opens the DM and copies which service, ready to paste,
 * since Instagram's links can't reliably prefill a message. Still a plain link
 * without JavaScript, or where the clipboard is off limits.
 */
export function ServiceLink({
  href,
  message,
  label,
  newTab,
  className,
  children,
}: {
  href: string;
  message: string;
  label: string;
  /** The dashboard preview opens links outside the frame. */
  newTab: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className={className}
      {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}
      onClick={() => {
        navigator.clipboard?.writeText(message).catch(() => {});
      }}
    >
      {children}
    </a>
  );
}
