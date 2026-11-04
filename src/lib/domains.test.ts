import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DOMAIN_TLDS,
  MAX_DOMAIN_COST_CENTS,
  affordable,
  domainLabel,
  firstChargeCents,
  yearlySavingsCents,
  registrarPriceCents,
  sellableDomain,
} from "./domains";

test("the first charge always covers the most a name can cost", () => {
  assert.equal(firstChargeCents("yearly"), 9900);
  assert.equal(firstChargeCents("monthly"), 4000);
  // Stripe takes about 2.9% + 30¢. A pro who pays one month and leaves must still leave
  // at least $10 after the most expensive name we offer.
  const afterStripe = (c: number) => c - Math.round(c * 0.029) - 30;
  assert.ok(afterStripe(firstChargeCents("monthly")) - MAX_DOMAIN_COST_CENTS >= 1000);
  // Yearly is clearly the better deal.
  assert.ok(yearlySavingsCents() >= 5000);
});

test("names are cleaned to a DNS label", () => {
  assert.equal(domainLabel("Studio Nova!"), "studionova");
  assert.equal(domainLabel("https://www.Fresh-Cuts.com"), "fresh-cuts");
  assert.equal(domainLabel("Café & Co"), "cafeandco");
  assert.equal(domainLabel("--a--b--"), "a-b");
  assert.equal(domainLabel("!!!"), null);
  assert.equal(domainLabel("a".repeat(64)), null);
});

test("only .com and .pro names are sold", () => {
  assert.equal(sellableDomain("StudioNova.com"), "studionova.com");
  assert.equal(sellableDomain("studio-nova.pro"), "studio-nova.pro");
  assert.equal(sellableDomain("studionova.net"), null);
  assert.equal(sellableDomain("-studio.com"), null);
  assert.equal(sellableDomain("studio-.com"), null);
  assert.equal(sellableDomain("a.b.com"), null);
});

test("registrar prices become cents; the cap applies to both years", () => {
  assert.equal(registrarPriceCents(11.25), 1125);
  assert.equal(registrarPriceCents("21.99"), 2199);
  assert.equal(registrarPriceCents("n/a"), null);
  assert.ok(affordable(200, 2199));
  assert.ok(!affordable(200, 4000));
  assert.ok(!affordable(null, 1000));
});

test("the sold endings match the database check", () => {
  const sql = readFileSync("supabase/migrations/20261026000000_custom_domains.sql", "utf8");
  assert.ok(sql.includes(`\\.(${DOMAIN_TLDS.join("|")})$`));
});

test("US phone numbers become E.164", async () => {
  const { usPhoneE164 } = await import("./domains");
  assert.equal(usPhoneE164("(702) 555-0134"), "+17025550134");
  assert.equal(usPhoneE164("+1 702 555 0134"), "+17025550134");
  assert.equal(usPhoneE164("555-0134"), null);
  assert.equal(usPhoneE164("+44 20 7946 0958"), null);
});

test("registrar orders count as failed or done only on a final answer", async () => {
  const { readOrderStatus } = await import("./domains");
  assert.equal(readOrderStatus({ status: "purchasing" }), "pending");
  assert.equal(readOrderStatus({ status: "draft" }), "pending");
  assert.equal(
    readOrderStatus({ status: "purchasing", domains: [{ status: "pending" }] }),
    "pending",
  );
  assert.equal(readOrderStatus({ status: "something-new" }), "pending");
  assert.equal(
    readOrderStatus({ status: "completed", domains: [{ status: "completed" }] }),
    "completed",
  );
  assert.equal(readOrderStatus({ status: "completed" }), "completed");
  assert.equal(
    readOrderStatus({ status: "completed", domains: [{ status: "pending" }] }),
    "pending",
  );
  assert.equal(readOrderStatus({ status: "failed" }), "failed");
  assert.equal(
    readOrderStatus({ status: "purchasing", domains: [{ status: "refunded" }] }),
    "failed",
  );
});
