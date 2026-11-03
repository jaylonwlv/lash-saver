"use client";

import { useEffect } from "react";

/**
 * Tells us once when this page is opened from Instagram (a tap on the pro's bio
 * link, usually), so their dashboard can tick "Put your page in your bio". Sends
 * only the page's address, once per phone.
 */
export function InstagramVisit({ slug }: { slug: string }) {
  useEffect(() => {
    if (!cameFromInstagram()) return;
    const key = `dibs:ig-visit:${slug}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    void fetch("/api/page-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}

function cameFromInstagram(): boolean {
  // Instagram's own browser says so; a link opened from it elsewhere has its referrer.
  if (/\bInstagram\b/.test(navigator.userAgent)) return true;
  try {
    return /(^|\.)instagram\.com$/.test(new URL(document.referrer).hostname);
  } catch {
    return false;
  }
}
