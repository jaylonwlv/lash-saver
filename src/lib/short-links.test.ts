import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SHORT_SIGNUP_LINKS, shortLinkRedirects } from "./short-links";
import { RESERVED_SLUGS } from "./slugs";
import { TRADES } from "./trades";

describe("short sign-up links", () => {
  it("only use reserved words, so no pro's page can sit there", () => {
    for (const word of Object.keys(SHORT_SIGNUP_LINKS)) {
      assert.ok(RESERVED_SLUGS.has(word), word);
    }
  });

  it("point at real trades", () => {
    const ids = new Set(TRADES.map((t) => t.id as string));
    for (const trade of Object.values(SHORT_SIGNUP_LINKS)) assert.ok(ids.has(trade), trade);
  });

  it("go to /start with the trade picked", () => {
    assert.deepEqual(shortLinkRedirects()[0], {
      source: "/nails",
      destination: "/start?trade=nails",
      permanent: false,
    });
  });
});
