"use client";

import { useEffect } from "react";
import { REF_KEY, REF_PATTERN } from "@/lib/referral";

/**
 * Ads aimed at one trade link to getdibs.pro/?trade=barber. The landing page stays
 * trade-neutral; this just remembers the trade for this visit so /start can skip
 * "What do you do?" (message match without naming trades on marketing pages).
 */
export const AD_TRADE_KEY = "dibs:ad-trade";

export function RememberTrade() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trade = params.get("trade");
    if (trade && /^[a-z]{2,20}$/.test(trade)) {
      try {
        sessionStorage.setItem(AD_TRADE_KEY, trade);
      } catch {}
    }
    // A "Powered by Dibs" link (?ref=<pro's slug>): remembered for a week, sent with
    // sign-up so we know which pro's page they came from (lib/referral.ts).
    const ref = params.get("ref");
    if (ref && REF_PATTERN.test(ref)) {
      try {
        localStorage.setItem(REF_KEY, JSON.stringify({ slug: ref, at: Date.now() }));
      } catch {}
    }
  }, []);
  return null;
}
