"use client";

import { useEffect, useRef, useState } from "react";
import { ACCENTS, ACCENT_IDS, type AccentId } from "@/lib/accents";
import { applyAppColor, parseTheme, saveAppColor, statusBarColor } from "@/lib/theme";

/**
 * Color dot in the header: recolors the pro's app and remembers it for a year.
 * The panel hangs from the header row (position: relative there), so it stays on
 * a 375px screen wherever the dot sits.
 */
export function AppColorPicker({ initial }: { initial: AccentId }) {
  const [color, setColor] = useState<AccentId>(initial);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function choose(next: AccentId) {
    saveAppColor(next);
    const app = document.querySelector<HTMLElement>("[data-app]");
    if (app) {
      applyAppColor(app, next);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", statusBarColor(parseTheme(app.dataset.theme), next));
    }
    setColor(next);
  }

  return (
    <div ref={root}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Change app color"
        className="press bg-ink/10 flex size-11 items-center justify-center rounded-full dark:bg-white/10"
      >
        <span
          aria-hidden
          className="ring-ink/25 size-6 rounded-full ring-2 dark:ring-white/40"
          style={{ backgroundColor: ACCENTS[color].bright }}
        />
      </button>
      {open && (
        <div className="card text-foreground absolute top-full right-0 z-20 mt-2 w-[min(19rem,calc(100vw-2.5rem))] p-4">
          <h2 className="font-display text-base font-extrabold tracking-tight">App color</h2>
          <p className="text-muted mt-1 text-sm">
            Just for your app. Your clients see the color on your Profile.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1">
            {ACCENT_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => choose(id)}
                aria-pressed={id === color}
                className="press flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold aria-pressed:bg-black/5 dark:aria-pressed:bg-white/10"
              >
                <span
                  aria-hidden
                  className="flex size-8 items-center justify-center rounded-full text-sm font-extrabold text-black"
                  style={{ backgroundColor: ACCENTS[id].bright }}
                >
                  {id === color ? "✓" : ""}
                </span>
                {ACCENTS[id].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
