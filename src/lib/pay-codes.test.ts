import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PAY_CODE_ALPHABET, PAY_CODE_LENGTH, isUuid, normalizePayCode, payPath } from "./pay-codes";

test("the alphabet and length match the SQL generator", () => {
  const sql = readFileSync("supabase/migrations/20261024000000_short_pay_links.sql", "utf8");
  assert.ok(sql.includes(`alphabet constant text := '${PAY_CODE_ALPHABET}'`));
  assert.equal(PAY_CODE_ALPHABET.length, 31);
  assert.ok(sql.includes("% 31"));
  const picks = sql.match(/picks constant int\[\] := array\[([^\]]+)\]/);
  assert.equal(picks?.[1].split(",").length, PAY_CODE_LENGTH);
});

test("codes are accepted, lowercased; anything else isn't", () => {
  assert.equal(normalizePayCode("k7m2x9qa4h"), "k7m2x9qa4h");
  assert.equal(normalizePayCode("K7M2X9QA4H"), "k7m2x9qa4h");
  assert.equal(normalizePayCode("k7m2x9qa4"), null);
  assert.equal(normalizePayCode("k7m2x9qa4h1"), null);
  assert.equal(normalizePayCode("k7m2x9qa0h"), null);
  assert.equal(normalizePayCode("957aabd6-bb02-42ae-a067-0d9ed07587e0"), null);
});

test("uuids still recognized for old links", () => {
  assert.ok(isUuid("957aabd6-bb02-42ae-a067-0d9ed07587e0"));
  assert.ok(!isUuid("k7m2x9qa4h"));
});

test("payPath prefers the code, falls back to the id", () => {
  assert.equal(payPath({ id: "abc", pay_code: "k7m2x9qa4h" }), "/pay/k7m2x9qa4h");
  assert.equal(payPath({ id: "abc", pay_code: null }), "/pay/abc");
  assert.equal(payPath({ id: "abc" }), "/pay/abc");
});
