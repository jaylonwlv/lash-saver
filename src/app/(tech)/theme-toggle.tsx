"use client";

import { useEffect, useState } from "react";
import { THEME_COOKIE, statusBarColor, type Theme } from "@/lib/theme";

/** Moon/sun switch in the header: flips the whole app and remembers it for a year. */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  // Overscroll and the status bar follow the theme too.
  useEffect(() => {
    document.documentElement.style.backgroundColor = theme === "dark" ? "#0d0b0c" : "";
    const accent = document.querySelector<HTMLElement>("[data-app]")?.dataset.accent;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", statusBarColor(theme, accent));
    return () => {
      document.documentElement.style.backgroundColor = "";
    };
  }, [theme]);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.querySelector("[data-app]")?.setAttribute("data-theme", next);
    setTheme(next);
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="press bg-ink/10 flex min-h-11 items-center gap-2 rounded-full px-3.5 text-sm font-bold dark:bg-white/10"
    >
      {dark ? (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          className="size-5"
        >
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" />
        </svg>
      )}
      {dark ? "Light" : "Dark"}
    </button>
  );
}
