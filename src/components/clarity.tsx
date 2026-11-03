import { ClarityScope } from "./clarity-scope";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

/**
 * Microsoft Clarity (free heatmaps and session recordings) for our own marketing
 * pages: the landing page, /start and the demo. Never on pay links, menu pages or
 * the dashboard (ClarityScope stops it when a visitor leaves these pages without a
 * reload, e.g. /start → their dashboard). Off unless NEXT_PUBLIC_CLARITY_ID is set.
 *
 * Typed text is masked by Clarity (keep Masking on Balanced or Strict in its
 * settings). Visitors whose time zone is in Europe get Clarity's "no consent"
 * signal, so it runs without cookies there (its terms ask for consent in the
 * EEA, UK and Switzerland).
 */
export function Clarity({ projectId }: { projectId: string | undefined }) {
  if (!projectId || !/^[a-z0-9]{6,20}$/i.test(projectId)) return null;
  const snippet = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${projectId}");try{if(/^Europe\\//.test(Intl.DateTimeFormat().resolvedOptions().timeZone)){window.clarity("consentv2",{ad_Storage:"denied",analytics_Storage:"denied"});}}catch(e){}`;
  return (
    <>
      {/* Runs while the HTML is parsed; React never runs it again on the client. */}
      <script id="ms-clarity" dangerouslySetInnerHTML={{ __html: snippet }} />
      <ClarityScope />
    </>
  );
}
