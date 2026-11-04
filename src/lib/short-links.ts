/*
 * Short sign-up links to paste into DMs and comments (getdibs.pro/nails →
 * /start?trade=nails). Each word is reserved, so no pro can take it as a menu
 * page address. Used by next.config.ts redirects. No server deps (tested).
 */

export const SHORT_SIGNUP_LINKS: Readonly<Record<string, string>> = {
  nails: "nails",
  lashes: "lashes",
  estheticians: "esthetician",
  esthetician: "esthetician",
  barber: "barber",
  barbers: "barber",
  tattoo: "tattoo",
  hair: "hair",
  photography: "photography",
  photographers: "photography",
  fitness: "fitness",
  trainers: "fitness",
};

export function shortLinkRedirects() {
  return Object.entries(SHORT_SIGNUP_LINKS).map(([word, trade]) => ({
    source: `/${word}`,
    destination: `/start?trade=${trade}`,
    permanent: false,
  }));
}
