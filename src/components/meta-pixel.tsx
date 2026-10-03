"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Meta Pixel for measuring ads. Marketing pages and sign-in only: never on pay
 * links, booking pages or the dashboard (the Privacy Policy says so).
 *
 * Sign-in moves to the dashboard without a page reload, so the script stays in
 * memory there. disablePushState and autoConfig off stop it from tracking those
 * navigations and button taps on its own: it only sends the events this
 * component and trackPixel fire, from the pages that render it.
 */
export function MetaPixel({ pixelId }: { pixelId: string | undefined }) {
  const pathname = usePathname();
  const first = useRef(true);
  // Set when the Pixel loaded on an earlier page (landing → sign-in): the snippet
  // won't run again, so this component tracks that first view itself.
  const loadedBefore = useRef(typeof window !== "undefined" && Boolean(window.fbq));

  // The snippet tracks the first page view; this tracks later client-side navigations.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!loadedBefore.current) return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  if (!pixelId) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq.disablePushState=true;fbq('set','autoConfig',false,'${pixelId}');fbq('init','${pixelId}');fbq('track','PageView');`}
    </Script>
  );
}

/**
 * Tracks a Pixel event from a page that renders <MetaPixel>. The snippet loads
 * after hydration, so this waits briefly for it; with no Pixel it does nothing.
 */
export function trackPixel(event: string, { custom = false } = {}) {
  let tries = 0;
  const send = () => {
    if (window.fbq) window.fbq(custom ? "trackCustom" : "track", event);
    else if (tries++ < 25) setTimeout(send, 200);
  };
  send();
}
