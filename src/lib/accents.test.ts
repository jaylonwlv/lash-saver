import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ACCENTS, ACCENT_IDS, accentFor, accentStyle } from "./accents";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** `soft` as the pages use it: 60% over the cream page (bg-brand-soft/60). */
function softTint(soft: string): string {
  const mix = [1, 3, 5].map((i) =>
    Math.round(
      0.6 * parseInt(soft.slice(i, i + 2), 16) + 0.4 * parseInt("fdf8f6".slice(i - 1, i + 1), 16),
    ),
  );
  return `#${mix.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("every accent is readable: white on brand, black on bright, brand on soft", () => {
  for (const [id, a] of Object.entries(ACCENTS)) {
    assert.ok(contrast(a.brand, "#ffffff") >= 4.5, `${id}: white on brand`);
    assert.ok(contrast(a.bright, "#0d0b0c") >= 4.5, `${id}: black on bright`);
    assert.ok(contrast(a.brand, softTint(a.soft)) >= 4.5, `${id}: brand text on the soft tint`);
    assert.ok(contrast(a.brand, "#fdf8f6") >= 4.5, `${id}: brand text on the page`);
  }
});

test("unknown or missing accents fall back to pink", () => {
  assert.equal(accentFor(null), ACCENTS.pink);
  assert.equal(accentFor("toString"), ACCENTS.pink);
  assert.equal(accentFor("ocean"), ACCENTS.ocean);
  assert.deepEqual(accentStyle("gold"), {
    "--brand": ACCENTS.gold.brand,
    "--brand-soft": ACCENTS.gold.soft,
    "--pink": ACCENTS.gold.bright,
  });
});

test("the database check lists the same accents", () => {
  const sql = readFileSync("supabase/migrations/20261020000000_accent_color.sql", "utf8");
  const listed = [...(sql.match(/in \(([^)]*)\)/)?.[1] ?? "").matchAll(/'([a-z]+)'/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(listed.sort(), [...ACCENT_IDS].sort());
});
