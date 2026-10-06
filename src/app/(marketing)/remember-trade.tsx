"use client";

import { useEffect } from "react";

/**
 * Ads aimed at one trade link to getdibs.pro/?trade=barber. The landing page stays
 * trade-neutral; this just remembers the trade for this visit so /start can skip
 * "What do you do?" (message match without naming trades on marketing pages).
 */
export const AD_TRADE_KEY = "dibs:ad-trade";

export function RememberTrade() {
  useEffect(() => {
    const trade = new URLSearchParams(window.location.search).get("trade");
    if (!trade || !/^[a-z]{2,20}$/.test(trade)) return;
    try {
      sessionStorage.setItem(AD_TRADE_KEY, trade);
    } catch {}
  }, []);
  return null;
}
