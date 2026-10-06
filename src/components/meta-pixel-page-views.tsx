"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * PageView for pages reached without a full load (landing → sign-in). The
 * snippet in <MetaPixel> tracks the full page load itself, and React doesn't run
 * that snippet again on client navigations, so this sends the rest.
 */
export function PixelPageViews() {
  const pathname = usePathname();
  useEffect(() => {
    // The first page after a full load was tracked by the snippet: skip it once.
    if (window.__dibsPixelInitialView) {
      window.__dibsPixelInitialView = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);
  return null;
}
