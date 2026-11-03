/*
 * The look of a pro's own page (getdibs.pro/<slug>): a few designed presets,
 * not a font picker, so every page stays readable with any accent color. New
 * pros start on the one that suits their trade. Must match the
 * profiles.page_style check in supabase/migrations/20261021000000_page_style.sql.
 * No server deps (tested).
 */

export const PAGE_STYLES = {
  editorial: { label: "Editorial", note: "Elegant serif, soft italics" },
  bold: { label: "Bold", note: "Heavy, tall, all caps" },
  clean: { label: "Clean", note: "Simple, calm, modern" },
} as const;

export type PageStyleId = keyof typeof PAGE_STYLES;
export const PAGE_STYLE_IDS = Object.keys(PAGE_STYLES) as [PageStyleId, ...PageStyleId[]];
export const DEFAULT_PAGE_STYLE: PageStyleId = "editorial";

const BY_TRADE: Partial<Record<string, PageStyleId>> = {
  barber: "bold",
  tattoo: "bold",
  detailing: "bold",
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
