import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canCreatePayLink, trialEndFor } from "./subscription";

const day = 86_400_000;
const signup = new Date("2026-11-02T18:00:00Z");

describe("trialEndFor", () => {
  it("ends 30 days after sign-up for a card added early", () => {
    const end = trialEndFor(signup, new Date(signup.getTime() + 5 * day));
    assert.equal(end.toISOString(), new Date(signup.getTime() + 30 * day).toISOString());
  });
  it("still gives at least 7 days when the card comes late", () => {
    const now = new Date(signup.getTime() + 28 * day);
    assert.equal(trialEndFor(signup, now).getTime(), now.getTime() + 7 * day);
    const muchLater = new Date(signup.getTime() + 90 * day);
    assert.equal(trialEndFor(signup, muchLater).getTime(), muchLater.getTime() + 7 * day);
  });
  it("switches at day 23 exactly", () => {
    const now = new Date(signup.getTime() + 23 * day);
    assert.equal(trialEndFor(signup, now).getTime(), signup.getTime() + 30 * day);
  });
});

describe("canCreatePayLink", () => {
  it("allows the first link without a subscription, then needs one", () => {
    assert.equal(canCreatePayLink(null, 0), true);
    assert.equal(canCreatePayLink(null, 1), false);
    assert.equal(canCreatePayLink("trialing", 5), true);
    assert.equal(canCreatePayLink("past_due", 5), true);
    assert.equal(canCreatePayLink("canceled", 5), false);
  });
});
