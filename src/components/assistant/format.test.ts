import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAnswer } from "./format";

const allowed = { "/start": "Start free", "/demo": "Try the demo pay link" };
const email = "help@example.com";

describe("parseAnswer", () => {
  it("turns allowed links and the email into buttons, keeping the words in place", () => {
    const { lines, links } = parseAnswer(
      "You can [Start free](/start) today. Stuck? [Email us](email).",
      allowed,
      email,
    );
    assert.deepEqual(links, [
      { label: "Start free", href: "/start", email: false },
      { label: "Email us", href: "mailto:help@example.com", email: true },
    ]);
    assert.equal(
      lines[0].pieces.map((p) => p.text).join(""),
      "You can Start free today. Stuck? Email us.",
    );
  });

  it("never links anywhere off the allow-list", () => {
    const { lines, links } = parseAnswer(
      "See [this](https://evil.example) and [that](/dashboard/billing) and [x](javascript:alert(1))",
      allowed,
      email,
    );
    assert.deepEqual(links, []);
    assert.match(lines[0].pieces.map((p) => p.text).join(""), /^See this and that and x/);
  });

  it("reads bullets, bold and drops headings", () => {
    const { lines } = parseAnswer(
      "## Price\n- **$29/month** after the trial\n- Cancel anytime",
      allowed,
      email,
    );
    assert.equal(lines.length, 3);
    assert.equal(lines[0].bullet, false);
    assert.equal(lines[0].pieces[0].text, "Price");
    assert.equal(lines[1].bullet, true);
    assert.deepEqual(lines[1].pieces[0], { text: "$29/month", bold: true });
    assert.equal(lines[2].pieces[0].text, "Cancel anytime");
  });

  it("keeps at most three links and no duplicates", () => {
    const { links } = parseAnswer(
      "[Start free](/start) [Start free](/start) [Try the demo pay link](/demo) [Email us](email) [Email us](email)",
      allowed,
      email,
    );
    assert.equal(links.length, 3);
  });

  it("shows a line of only links as buttons, not words", () => {
    const { lines, links } = parseAnswer(
      "You get an email either way.\n[Start free](/start) or [Try the demo pay link](/demo).",
      allowed,
      email,
    );
    assert.equal(lines.length, 1);
    assert.equal(lines[0].pieces[0].text, "You get an email either way.");
    assert.equal(links.length, 2);
  });

  it("handles several link-only lines in a row", () => {
    const { lines, links } = parseAnswer(
      "Done.\n[Start free](/start)\n[Try the demo pay link](/demo)\n[Email us](email)",
      allowed,
      email,
    );
    assert.equal(lines.length, 1);
    assert.equal(links.length, 3);
  });
});
