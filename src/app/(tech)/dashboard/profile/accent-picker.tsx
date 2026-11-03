"use client";

import { useState } from "react";
import { ACCENTS, ACCENT_IDS, accentStyle } from "@/lib/accents";

/**
 * The pro's color on their pay links and menu page: a row of swatches (radio
 * buttons, so it posts with the form) and a small preview of what clients see.
 */
export function AccentPicker({
  defaultValue,
  error,
  businessName,
}: {
  defaultValue: string;
  error?: string;
  businessName: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const name = businessName.trim() || "Your business";

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-sm font-medium">Your color</legend>
      <p className="text-muted -mt-1 text-sm">
        On your pay links and menu page, so they look like your brand.
      </p>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
        {ACCENT_IDS.map((id) => {
          const a = ACCENTS[id];
          return (
            <label
              key={id}
              className="press has-[:checked]:border-foreground has-[:focus-visible]:outline-brand flex min-h-12 cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-transparent p-1.5 has-[:focus-visible]:outline-2"
            >
              <input
                type="radio"
                name="accent_color"
                value={id}
                checked={value === id}
                onChange={() => setValue(id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className="flex size-9 overflow-hidden rounded-full ring-1 ring-black/10"
              >
                <span className="w-1/2" style={{ background: a.brand }} />
                <span className="w-1/2" style={{ background: a.bright }} />
              </span>
              <span className="text-[11px] leading-tight font-medium">{a.label}</span>
            </label>
          );
        })}
      </div>
      {/* What clients see, in the chosen color. */}
      {/* Client pages are always light, so the preview is too (even in dark mode). */}
      <div
        aria-hidden
        data-theme="light"
        className="border-line overflow-hidden rounded-2xl border"
        style={accentStyle(value)}
      >
        <div className="bg-ink flex items-center gap-2 px-4 py-3 text-white">
          <span className="bg-pink text-ink font-display flex size-7 items-center justify-center rounded-full text-sm font-extrabold">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="truncate text-sm font-semibold">{name}</span>
        </div>
        <div className="bg-brand-soft/60 flex flex-col gap-2 p-4">
          <p className="text-brand text-sm font-bold">Hi Jordan,</p>
          <span className="bg-brand text-brand-foreground flex min-h-11 items-center justify-center rounded-xl text-sm font-bold">
            Pay $25 deposit
          </span>
        </div>
      </div>
      {error && <p className="text-danger text-sm">{error}</p>}
    </fieldset>
  );
}
