import assert from "node:assert/strict";
import { test } from "node:test";
import { ACCENTS, ACCENT_IDS, DEFAULT_ACCENT } from "./accents";
import { appColorStyle, parseAppColor, parseTheme, statusBarColor } from "./theme";

test("parseTheme falls back to light", () => {
  assert.equal(parseTheme("dark"), "dark");
  assert.equal(parseTheme("light"), "light");
  assert.equal(parseTheme("nope"), "light");
  assert.equal(parseTheme(undefined), "light");
});

test("parseAppColor accepts every accent and nothing else", () => {
  for (const id of ACCENT_IDS) {
    assert.equal(parseAppColor(id), id);
  }
  assert.equal(parseAppColor("toString"), DEFAULT_ACCENT);
  assert.equal(parseAppColor("#ff0000"), DEFAULT_ACCENT);
  assert.equal(parseAppColor(undefined), DEFAULT_ACCENT);
});

test("the status bar follows the header", () => {
  assert.equal(statusBarColor("light", undefined), ACCENTS.pink.bright);
  assert.equal(statusBarColor("light", "ocean"), ACCENTS.ocean.bright);
  assert.equal(statusBarColor("dark", "ocean"), "#1f1a1d");
});

test("appColorStyle carries the accent's colors", () => {
  assert.deepEqual(appColorStyle("teal"), {
    "--app-bright": ACCENTS.teal.bright,
    "--app-brand": ACCENTS.teal.brand,
    "--app-soft": ACCENTS.teal.soft,
  });
});
