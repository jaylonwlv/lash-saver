/*
 * The pro's app can be light or dark, their choice, remembered in a cookie so
 * the server renders the right theme (no flash). Client pages stay light.
 */

export const THEME_COOKIE = "dibs-theme";

export type Theme = "light" | "dark";

export function parseTheme(value: string | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}

/** Phone status bar color: the header's color in each theme. */
export const THEME_COLOR: Record<Theme, string> = { light: "#ff5c9d", dark: "#1f1a1d" };
