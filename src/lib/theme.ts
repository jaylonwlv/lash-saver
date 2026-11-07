import type { CSSProperties } from "react";
import { ACCENTS, DEFAULT_ACCENT, accentFor, type AccentId } from "./accents";

/*
 * The pro's app can be light or dark and any accent color, their choice, each
 * remembered in a cookie so the server renders it (no flash). Client pages stay
 * light and keep their own color (profiles.accent_color). No server deps (tested).
 */

export const THEME_COOKIE = "dibs-theme";
export const APP_COLOR_COOKIE = "dibs-color";

export type Theme = "light" | "dark";

export function parseTheme(value: string | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}

/** The app color for a stored value; anything unknown falls back to the default. */
export function parseAppColor(value: string | undefined): AccentId {
  return value && Object.hasOwn(ACCENTS, value) ? (value as AccentId) : DEFAULT_ACCENT;
}

/** Phone status bar color: the header's color in each theme. */
export function statusBarColor(theme: Theme, color: string | undefined): string {
  return theme === "dark" ? "#1f1a1d" : accentFor(color).bright;
}

/** CSS variables behind [data-app][data-accent] in globals.css. */
export function appColorStyle(id: AccentId): CSSProperties {
  const accent = ACCENTS[id];
  return {
    "--app-bright": accent.bright,
    "--app-brand": accent.brand,
    "--app-soft": accent.soft,
  } as CSSProperties;
}

/** Remembers the color for a year, on this phone. */
export function saveAppColor(id: AccentId) {
  document.cookie = `${APP_COLOR_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
}

/** Recolors the running app. The default has no attribute, so it stays the stock palette. */
export function applyAppColor(app: HTMLElement, id: AccentId) {
  if (id === DEFAULT_ACCENT) {
    app.removeAttribute("data-accent");
    return;
  }
  Object.entries(appColorStyle(id)).forEach(([name, value]) => {
    app.style.setProperty(name, String(value));
  });
  app.setAttribute("data-accent", id);
}
