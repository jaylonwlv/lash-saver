import assert from "node:assert/strict";
import { test } from "node:test";
import { proTagline, serviceMessage } from "./pro-page";

test("proTagline joins what the pro filled in", () => {
  assert.equal(proTagline("Nail tech", "Las Vegas"), "Nail tech · Las Vegas");
  assert.equal(proTagline("Nail tech", null), "Nail tech");
  assert.equal(proTagline(null, "Las Vegas"), "Las Vegas");
  assert.equal(proTagline("  ", "Las Vegas"), "Las Vegas");
  assert.equal(proTagline(null, null), null);
});

test("serviceMessage names the service", () => {
  assert.equal(serviceMessage("Full set"), "Hi! I'd like to book Full set.");
});
