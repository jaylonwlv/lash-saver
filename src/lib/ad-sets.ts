/**
 * Meta ad sets with their own landing page. Ad links carry the ad set's ID as
 * utm_term (Meta adds it), so proxy.ts can show a trade's version of the homepage
 * at "/" without editing the ad (an edit restarts Meta's learning).
 */
const AD_SET_LANDINGS: Readonly<Record<string, string>> = {
  // Detailers
  "120272360900830362": "/detailers",
};

/** The landing page for an ad click on "/", or null for the normal homepage. */
export function landingForAdSet(utmTerm: string | null): string | null {
  return (utmTerm && Object.hasOwn(AD_SET_LANDINGS, utmTerm) && AD_SET_LANDINGS[utmTerm]) || null;
}
