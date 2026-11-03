/*
 * Menu pages live at the root (getdibs.pro/studio-nova), so a pro's link must
 * never take an address the app needs: its own pages, likely future ones, and
 * trade words kept for niche landing pages. Must match the check in
 * supabase/migrations/20261019000000_root_menu_pages.sql. No server deps (tested).
 */

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // App pages and route prefixes.
  "start",
  "login",
  "logout",
  "signup",
  "signin",
  "demo",
  "terms",
  "privacy",
  "catering",
  "pay",
  "dashboard",
  "api",
  "auth",
  "unsubscribe",
  "b",
  "c",
  "e",
  "t",
  // Likely future pages.
  "admin",
  "app",
  "about",
  "blog",
  "help",
  "support",
  "pricing",
  "contact",
  "settings",
  "billing",
  "account",
  "www",
  "mail",
  "static",
  "assets",
  "images",
  "dibs",
  "getdibs",
  // Trade words, for niche landing pages.
  "lashes",
  "lash-techs",
  "nails",
  "nail-techs",
  "hair",
  "braiders",
  "barbers",
  "barber",
  "tattoo",
  "estheticians",
  "esthetician",
  "detailing",
  "detailers",
  "photography",
  "photographers",
  "fitness",
  "trainers",
  "food-trucks",
  "caterers",
]);

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/** A menu page link suggested from the business name: "Fresh Cuts & Co." → "fresh-cuts-and-co". */
export function slugFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

/**
 * The menu page link sign-up gives a business name: "Fresh Cuts" → "fresh-cuts",
 * never a reserved word ("Start" → "start-studio"). Sign-up adds a number if it's taken.
 */
export function pageSlugFor(name: string): string {
  let slug = slugFromName(name).slice(0, 34).replace(/-+$/, "");
  if (slug.length < 3) slug = `${slug || "my"}-studio`.replace(/^-/, "");
  // "Start", "Pricing", "Barbers"…: those addresses belong to the app.
  if (isReservedSlug(slug)) slug = `${slug}-studio`;
  return SLUG_PATTERN.test(slug) ? slug : "my-studio";
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/** A pro's menu page: getdibs.pro/studio-nova. */
export function menuPageUrl(appUrl: string, slug: string): string {
  return `${appUrl.replace(/\/$/, "")}/${slug}`;
}
