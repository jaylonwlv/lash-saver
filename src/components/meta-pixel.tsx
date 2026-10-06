import { PixelPageViews } from "./meta-pixel-page-views";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    /** Set by the snippet: the full page load's PageView is already tracked. */
    __dibsPixelInitialView?: boolean;
  }
}

/**
 * Meta Pixel for measuring ads. Marketing pages and sign-in only: never on pay
 * links, menu pages or the dashboard (the Privacy Policy says so).
 *
 * The snippet is plain HTML in the server response, so it starts loading Meta's
 * script as the page loads, as Meta recommends. (Loading it after the app's
 * JavaScript, as before, took 2-3 s on phones, and ad visitors who left sooner
 * were never counted as landing page views.)
 *
 * Sign-in moves to the dashboard without a page reload, so the script stays in
 * memory there. disablePushState and autoConfig off stop it from tracking those
 * navigations and button taps on its own: it only sends the events the snippet,
 * PixelPageViews and trackPixel fire, from the pages that render this.
 */
export function MetaPixel({ pixelId }: { pixelId: string | undefined }) {
  if (!pixelId || !/^\d+$/.test(pixelId)) return null;
  const snippet = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq.disablePushState=true;fbq('set','autoConfig',false,'${pixelId}');fbq('init','${pixelId}');fbq('track','PageView');window.__dibsPixelInitialView=true;`;
  return (
    <>
      {/* Runs while the HTML is parsed; React never runs it again on the client. */}
      <script id="meta-pixel" dangerouslySetInnerHTML={{ __html: snippet }} />
      <PixelPageViews />
    </>
  );
}

/**
 * Tracks a Pixel event from a page that renders <MetaPixel>. The snippet defines
 * fbq as the page loads (events queue until Meta's script arrives); this waits
 * briefly in case it hasn't run yet. With no Pixel it does nothing.
 */
export function trackPixel(event: string, { custom = false } = {}) {
  let tries = 0;
  const send = () => {
    if (window.fbq) window.fbq(custom ? "trackCustom" : "track", event);
    else if (tries++ < 25) setTimeout(send, 200);
  };
  send();
}
