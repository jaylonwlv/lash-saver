import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePublicEnv, type PublicEnv } from "./env.public";

const base: Record<keyof PublicEnv, string | undefined> = {
  NEXT_PUBLIC_APP_URL: "https://getdibs.pro",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined,
  NEXT_PUBLIC_AUTH_PROVIDERS: undefined,
  NEXT_PUBLIC_CLARITY_ID: undefined,
  NEXT_PUBLIC_META_PIXEL_ID: undefined,
};

test("valid env parses, optional keys default", () => {
  const env = parsePublicEnv(base);
  assert.equal(env.NEXT_PUBLIC_APP_URL, "https://getdibs.pro");
  assert.deepEqual(env.NEXT_PUBLIC_AUTH_PROVIDERS, []);
  assert.equal(env.NEXT_PUBLIC_CLARITY_ID, undefined);
  assert.equal(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, undefined);
});

test("empty optional strings count as unset", () => {
  const env = parsePublicEnv({
    ...base,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    NEXT_PUBLIC_CLARITY_ID: "",
    NEXT_PUBLIC_META_PIXEL_ID: "",
    NEXT_PUBLIC_AUTH_PROVIDERS: " ",
  });
  assert.equal(env.NEXT_PUBLIC_META_PIXEL_ID, undefined);
  assert.deepEqual(env.NEXT_PUBLIC_AUTH_PROVIDERS, []);
});

test("providers are trimmed and lowercased", () => {
  const env = parsePublicEnv({ ...base, NEXT_PUBLIC_AUTH_PROVIDERS: " Google, apple ," });
  assert.deepEqual(env.NEXT_PUBLIC_AUTH_PROVIDERS, ["google", "apple"]);
});

test("names each bad key as missing or invalid", () => {
  assert.throws(
    () =>
      parsePublicEnv({
        ...base,
        NEXT_PUBLIC_APP_URL: undefined,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "sk_live_x",
        NEXT_PUBLIC_AUTH_PROVIDERS: "google,facebook",
        NEXT_PUBLIC_CLARITY_ID: "no!",
        NEXT_PUBLIC_META_PIXEL_ID: "abc",
      }),
    {
      message:
        "Invalid or missing public env vars: NEXT_PUBLIC_APP_URL (missing), NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (invalid), NEXT_PUBLIC_AUTH_PROVIDERS (invalid), NEXT_PUBLIC_CLARITY_ID (invalid), NEXT_PUBLIC_META_PIXEL_ID (invalid). See .env.example.",
    },
  );
  assert.throws(
    () => parsePublicEnv({ ...base, NEXT_PUBLIC_SUPABASE_URL: "not a url" }),
    /SUPABASE_URL \(invalid\)/,
  );
});

test("a trailing slash on the app URL is dropped (links are URL + /path)", () => {
  assert.equal(
    parsePublicEnv({ ...base, NEXT_PUBLIC_APP_URL: "https://getdibs.pro/" }).NEXT_PUBLIC_APP_URL,
    "https://getdibs.pro",
  );
});
