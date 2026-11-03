import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RESERVED_SLUGS, isReservedSlug, menuPageUrl, pageSlugFor } from "./slugs";

test("app pages and trade words are reserved, case-insensitively", () => {
  for (const s of ["start", "dashboard", "pay", "b", "pricing", "barbers", "Start"]) {
    assert.equal(isReservedSlug(s), true, s);
  }
  assert.equal(isReservedSlug("studio-nova"), false);
  assert.equal(isReservedSlug("start-studio"), false);
});

test("every top-level app route is reserved", async () => {
  const { readdirSync } = await import("node:fs");
  const dirs = (dir: string) =>
    readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  const top = new Set<string>();
  for (const name of dirs("src/app")) {
    // Route groups like (marketing) don't add a path segment; look inside them.
    if (name.startsWith("(")) dirs(`src/app/${name}`).forEach((n) => top.add(n));
    else top.add(name);
  }
  for (const name of top) {
    if (name.startsWith("[") || name.startsWith("_") || name.startsWith("(")) continue;
    if (name === "images") continue; // marketing assets folder, not a route, but reserved anyway
    assert.ok(RESERVED_SLUGS.has(name), `add "${name}" to RESERVED_SLUGS`);
  }
});

test("the database check lists the same words", () => {
  const sql = readFileSync("supabase/migrations/20261019000000_root_menu_pages.sql", "utf8");
  const listed = new Set([...sql.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]));
  assert.deepEqual([...RESERVED_SLUGS].sort(), [...listed].sort());
});

test("sign-up links come from the business name and avoid reserved words", () => {
  assert.equal(pageSlugFor("Fresh Cuts & Co."), "fresh-cuts-and-co");
  assert.equal(pageSlugFor("Start"), "start-studio");
  assert.equal(pageSlugFor("Barbers"), "barbers-studio");
  assert.equal(pageSlugFor("Jo"), "jo-studio");
  assert.equal(pageSlugFor("✨"), "my-studio");
  assert.equal(
    menuPageUrl("https://getdibs.pro/", "studio-nova"),
    "https://getdibs.pro/studio-nova",
  );
});
