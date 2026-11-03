import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TRADE_IDS } from "./trades";
import { PAGE_STYLE_IDS, pageStyleFor, pageStyleForTrade, stylesForTrade } from "./page-styles";

test("every trade starts on a real style", () => {
  for (const trade of [...TRADE_IDS, "other", null]) {
    assert.ok(PAGE_STYLE_IDS.includes(pageStyleForTrade(trade)), String(trade));
  }
  assert.equal(pageStyleForTrade("barber"), "bold");
  assert.equal(pageStyleForTrade("lashes"), "editorial");
  assert.equal(pageStyleForTrade("esthetician"), "clean");
  assert.equal(pageStyleForTrade("tattoo"), "metal");
  assert.equal(pageStyleForTrade("detailing"), "luxury");
});

test("tattoo and detailing get their own fonts first; a trade's default is in its picker", () => {
  assert.deepEqual(stylesForTrade("tattoo").trade, ["metal", "anime", "flash"]);
  assert.deepEqual(stylesForTrade("lashes").trade, []);
  for (const trade of [...TRADE_IDS, null]) {
    const { trade: own, general } = stylesForTrade(trade);
    assert.ok([...own, ...general].includes(pageStyleForTrade(trade)), String(trade));
  }
});

test("unknown stored styles fall back to editorial", () => {
  assert.equal(pageStyleFor("bold"), "bold");
  assert.equal(pageStyleFor("constructor"), "editorial");
  assert.equal(pageStyleFor(null), "editorial");
});

test("the database check lists the same styles", () => {
  const sql = readFileSync("supabase/migrations/20261022000000_trade_fonts.sql", "utf8");
  const listed = [...(sql.match(/in \(([^)]*)\)/)?.[1] ?? "").matchAll(/'([a-z]+)'/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(listed.sort(), [...PAGE_STYLE_IDS].sort());
});
