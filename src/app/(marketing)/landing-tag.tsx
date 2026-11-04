"use client";

import { useEffect } from "react";

/** Tags the Clarity session with the trade landing page shown (filter: landing = detailing). */
export function LandingTag({ trade }: { trade: string }) {
  useEffect(() => {
    window.clarity?.("set", "landing", trade);
  }, [trade]);
  return null;
}
