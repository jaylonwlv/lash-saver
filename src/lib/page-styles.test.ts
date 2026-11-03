import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TRADE_IDS } from "./trades";
import { PAGE_STYLE_IDS, pageStyleFor, pageStyleForTrade } from "./page-styles";

test("every trade starts on a real style", () => {
  for (const trade of [...TRADE_IDS, "other", null]) {
    assert.ok(PAGE_STYLE_IDS.includes(pageStyleForTrade(trade)), String(trade));
  }
  assert.equal(pageStyleForTrade("barber"), "bold");
  assert.equal(pageStyleForTrade("lashes"), "editorial");
  assert.equal(pageStyleForTrade("esthetician"), "clean");
});

test("unknown stored styles fall back to editorial", () => {
  assert.equal(pageStyleFor("bold"), "bold");
  assert.equal(pageStyleFor("constructor"), "editorial");
  assert.equal(pageStyleFor(null), "editorial");
});

test("the database check lists the same styles", () => {
  const sql = readFileSync("supabase/migrations/20261021000000_page_style.sql", "utf8");
  const listed = [...(sql.match(/in \(([^)]*)\)/)?.[1] ?? "").matchAll(/'([a-z]+)'/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(listed.sort(), [...PAGE_STYLE_IDS].sort());
});
