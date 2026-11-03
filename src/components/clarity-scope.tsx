"use client";

import { useEffect } from "react";

/**
 * Keeps Clarity to the pages that render <Clarity>: these pages hand off to the
 * sign-in page and the dashboard without a full reload, so the script would keep
 * recording there. It stops when they unmount and starts again on the way back.
 */
export function ClarityScope() {
  useEffect(() => {
    window.clarity?.("start");
    return () => window.clarity?.("stop");
  }, []);
  return null;
}
