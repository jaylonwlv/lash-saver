import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrices } from "./prices";

test("offered rows become cents; unticked rows are hidden", () => {
  const result = parsePrices(["a", "b"], {
    offer_a: "on",
    price_a: "$120",
    deposit_a: "40.50",
    price_b: "80",
    deposit_b: "20",
  });
  assert.deepEqual(result, {
    rows: [
      { id: "a", offer: true, price_cents: 12000, deposit_cents: 4050 },
      { id: "b", offer: false },
    ],
  });
});

test("each bad field gets its own message", () => {
  const result = parsePrices(["a", "b", "c"], {
    offer_a: "on",
    price_a: "abc",
    deposit_a: "10",
    offer_b: "on",
    price_b: "50",
    deposit_b: "0.50",
    offer_c: "on",
    price_c: "50",
    deposit_c: "60",
  });
  assert.ok("errors" in result);
  assert.equal(Object.keys(result.errors).sort().join(","), "deposit_b,deposit_c,price_a");
});

test("hiding everything is refused", () => {
  const result = parsePrices(["a"], { price_a: "50", deposit_a: "10" });
  assert.deepEqual(result, { errors: { form: "Keep at least one service on your page." } });
});

test("hiding every example is fine when other services are saved", () => {
  assert.deepEqual(parsePrices(["a"], {}, true), { rows: [{ id: "a", offer: false }] });
});
