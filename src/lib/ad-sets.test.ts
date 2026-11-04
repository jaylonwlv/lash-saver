import { test } from "node:test";
import assert from "node:assert/strict";
import { landingForAdSet } from "./ad-sets";

test("the Detailers ad set lands on /detailers; anything else on the homepage", () => {
  assert.equal(landingForAdSet("120272360900830362"), "/detailers");
  assert.equal(landingForAdSet("120272361017050362"), null);
  assert.equal(landingForAdSet(null), null);
  assert.equal(landingForAdSet("toString"), null);
});
