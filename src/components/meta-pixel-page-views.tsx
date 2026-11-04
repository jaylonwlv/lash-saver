"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * PageView for pages reached without a full load (landing → sign-in). The
 * snippet in <MetaPixel> tracks the full page load itself, and React doesn't run
 * that snippet again on client navigations, so this sends the rest.
 */
export function PixelPageViews({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  useEffect(() => {
    // The first page after a full load was tracked by the snippet: skip it once.
    if (window.__dibsPixelInitialView) {
      window.__dibsPixelInitialView = false;
      return;
    }
    // trackSingle, not track: with disablePushState Meta's script sends one "track"
    // PageView per page load and silently drops the rest (checked against fbevents.js).
    window.fbq?.("trackSingle", pixelId, "PageView");
  }, [pathname, pixelId]);
  return null;
}
