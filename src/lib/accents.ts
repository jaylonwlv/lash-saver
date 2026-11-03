import type { CSSProperties } from "react";

/*
 * The pro's own color on their client pages (pay links, menu page, link
 * preview). Fixed presets, not a free picker, so every one stays readable:
 * `brand` holds white text, `bright` holds black text and sits on the black
 * header. Must match the profiles.accent_color check in
 * supabase/migrations/20261020000000_accent_color.sql. No server deps (tested).
 */

export type Accent = { label: string; brand: string; soft: string; bright: string };

export const ACCENTS = {
  pink: { label: "Hot pink", brand: "#b23a5b", soft: "#f6d9e1", bright: "#ff5c9d" },
  plum: { label: "Plum", brand: "#7b3fa0", soft: "#ecdff5", bright: "#c79bf2" },
  ocean: { label: "Ocean", brand: "#1d5f96", soft: "#dbe9f6", bright: "#7cc0ff" },
  teal: { label: "Teal", brand: "#0f6b67", soft: "#d5eeec", bright: "#5fd6cc" },
  forest: { label: "Forest", brand: "#2f6b45", soft: "#dcecdf", bright: "#8fd9a4" },
  terracotta: { label: "Terracotta", brand: "#a3472a", soft: "#f5e0d7", bright: "#f59a75" },
  gold: { label: "Gold", brand: "#8a5a00", soft: "#f5e8cc", bright: "#f2c14e" },
  espresso: { label: "Espresso", brand: "#6b4430", soft: "#eee2da", bright: "#d9a98a" },
  charcoal: { label: "Charcoal", brand: "#3b3f46", soft: "#e4e5e8", bright: "#c9ced6" },
} as const satisfies Record<string, Accent>;

export type AccentId = keyof typeof ACCENTS;
export const ACCENT_IDS = Object.keys(ACCENTS) as [AccentId, ...AccentId[]];
export const DEFAULT_ACCENT: AccentId = "pink";

/** The accent for a stored value; anything unknown (or null) falls back to the default. */
export function accentFor(id: string | null | undefined): Accent {
  return id && Object.hasOwn(ACCENTS, id) ? ACCENTS[id as AccentId] : ACCENTS[DEFAULT_ACCENT];
}

/** CSS variables for a page wrapper: bg-brand, bg-brand-soft and bg-pink follow the accent. */
export function accentStyle(id: string | null | undefined): CSSProperties {
  const a = accentFor(id);
  return { "--brand": a.brand, "--brand-soft": a.soft, "--pink": a.bright } as CSSProperties;
}
