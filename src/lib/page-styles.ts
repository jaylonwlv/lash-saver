/*
 * The look of a pro's own page (getdibs.pro/<slug>): a few designed presets,
 * not a font picker, so every page stays readable with any accent color. New
 * pros start on the one that suits their trade. Some trades also get fonts from
 * their own world (tattoo: metal, 90s anime, old-school flash; detailing: ultra
 * luxury, performance, professional), shown first in their picker. Must match the
 * profiles.page_style check in supabase/migrations/20261022000000_trade_fonts.sql.
 * No server deps (tested).
 */

export const PAGE_STYLES = {
  editorial: { label: "Editorial", note: "Elegant serif, soft italics" },
  bold: { label: "Bold", note: "Heavy, tall, all caps" },
  clean: { label: "Clean", note: "Simple, calm, modern" },
  metal: { label: "Metal", note: "Band-poster lettering" },
  anime: { label: "90s anime", note: "Title-card heavy" },
  flash: { label: "Old-school", note: "Blackletter flash" },
  luxury: { label: "Ultra luxury", note: "Engraved capitals" },
  performance: { label: "Performance", note: "Motorsport wide" },
  professional: { label: "Professional", note: "Clean and squared" },
} as const;

export type PageStyleId = keyof typeof PAGE_STYLES;
export const PAGE_STYLE_IDS = Object.keys(PAGE_STYLES) as [PageStyleId, ...PageStyleId[]];
export const DEFAULT_PAGE_STYLE: PageStyleId = "editorial";

/** The three styles every pro can pick. */
export const GENERAL_STYLES: PageStyleId[] = ["editorial", "bold", "clean"];

/** Fonts from a trade's own world, offered first to pros in that trade. */
const TRADE_STYLES: Partial<Record<string, PageStyleId[]>> = {
  tattoo: ["metal", "anime", "flash"],
  detailing: ["luxury", "performance", "professional"],
};

/** What a pro sees in the picker: their trade's own fonts (if any), then the general three. */
export function stylesForTrade(trade: string | null | undefined): {
  trade: PageStyleId[];
  general: PageStyleId[];
} {
  return { trade: (trade && TRADE_STYLES[trade]) || [], general: GENERAL_STYLES };
}

const BY_TRADE: Partial<Record<string, PageStyleId>> = {
  barber: "bold",
  tattoo: "metal",
  detailing: "luxury",
  fitness: "bold",
  catering: "bold",
  esthetician: "clean",
  photography: "clean",
};

/** The style a new pro starts with, from what they do. */
export function pageStyleForTrade(trade: string | null | undefined): PageStyleId {
  return (trade && BY_TRADE[trade]) || DEFAULT_PAGE_STYLE;
}

/** A stored value, or the default for anything unknown. */
export function pageStyleFor(id: string | null | undefined): PageStyleId {
  return id && Object.hasOwn(PAGE_STYLES, id) ? (id as PageStyleId) : DEFAULT_PAGE_STYLE;
}
