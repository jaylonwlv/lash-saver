import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SUBSCRIPTION_PRICE_CENTS, TRIAL_DAYS } from "@/lib/config";
import { ASSISTANT_LINKS } from "@/components/assistant/links";
import { productFacts, systemPrompt } from "./facts";

describe("assistant facts", () => {
  it("states the real price and trial from config", () => {
    const facts = productFacts();
    assert.match(facts, new RegExp(`\\$${SUBSCRIPTION_PRICE_CENTS / 100}/month`));
    assert.match(facts, new RegExp(`${TRIAL_DAYS}-day free trial`));
  });

  it("offers only each surface's own pages as links", () => {
    assert.match(systemPrompt("site"), /\(\/start\)/);
    assert.doesNotMatch(systemPrompt("site"), /\(\/dashboard/);
    assert.match(systemPrompt("app"), /\(\/dashboard\/appointments\/new\)/);
    for (const path of [
      ...Object.keys(ASSISTANT_LINKS.site),
      ...Object.keys(ASSISTANT_LINKS.app),
    ]) {
      assert.ok(path.startsWith("/") && !path.startsWith("//"), path);
    }
  });

  it("never calls the menu page a booking page", () => {
    assert.doesNotMatch(productFacts(), /booking page/i);
  });
});
