import assert from "node:assert/strict";
import { test } from "node:test";
import { SIGN_IN_ERRORS, signInErrorCode, signInErrorText } from "./sign-in-errors";

test("raw provider and Supabase messages sort into codes", () => {
  assert.equal(signInErrorCode("Unable to exchange external code: c18d"), "provider");
  assert.equal(signInErrorCode("invalid flow state, no valid flow state found"), "flow");
  assert.equal(signInErrorCode("both auth code and code verifier should be non-empty"), "flow");
  assert.equal(signInErrorCode("access_denied"), "cancelled");
  assert.equal(signInErrorCode("Email link is invalid or has expired"), "expired");
  assert.equal(signInErrorCode(null), "other");
});

test("only known codes show their message; anything else is the general one", () => {
  assert.equal(signInErrorText("flow"), SIGN_IN_ERRORS.flow);
  assert.equal(signInErrorText("Your account is locked, call 555-0100"), SIGN_IN_ERRORS.other);
  assert.equal(signInErrorText("toString"), SIGN_IN_ERRORS.other);
  assert.equal(signInErrorText(undefined), SIGN_IN_ERRORS.other);
});
