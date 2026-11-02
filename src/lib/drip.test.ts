import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dripEmail, dueDripStep, underWeeklyCap, type DripInput } from "./drip";

const day = 86_400_000;
const first = new Date("2026-11-02T15:00:00Z");
const at = (d: number) => new Date(first.getTime() + d * day);

describe("dueDripStep", () => {
  it("follows the schedule: days 4, 9, 16, 24", () => {
    assert.equal(dueDripStep(first, at(3.9), {}), null);
    assert.equal(dueDripStep(first, at(4), {}), "tips");
    assert.equal(dueDripStep(first, at(8), { tips: at(4) }), null);
    assert.equal(dueDripStep(first, at(9), { tips: at(4) }), "policy");
    assert.equal(dueDripStep(first, at(16), { tips: at(4), policy: at(9) }), "cost");
    assert.equal(dueDripStep(first, at(24), { tips: at(4), policy: at(9), cost: at(16) }), "last");
    assert.equal(
      dueDripStep(first, at(30), { tips: at(4), policy: at(9), cost: at(16), last: at(24) }),
      null,
    );
  });
  it("never sends two within 3 days, even after missed runs", () => {
    // Cron was down: on day 10 only "tips" goes out; "policy" waits 3 more days.
    assert.equal(dueDripStep(first, at(10), {}), "tips");
    assert.equal(dueDripStep(first, at(12), { tips: at(10) }), null);
    assert.equal(dueDripStep(first, at(13), { tips: at(10) }), "policy");
  });
  it("gives up on very late steps", () => {
    assert.equal(dueDripStep(first, at(36), { tips: at(4) }), null);
  });
});

const base: DripInput = {
  step: "tips",
  trade: "nails",
  businessName: "Glow",
  windowHours: 24,
  announcement: "Hey! Quick update…",
  freeUntil: "Dec 2",
  monthly: "$29",
  topService: { name: "Full set", price: "$70", priceCents: 7000 },
  monthlyCents: 2900,
  depositsPaid: 1,
  billingUrl: "https://getdibs.pro/dashboard/billing",
  profileUrl: "https://getdibs.pro/dashboard/profile",
  newAppointmentUrl: "https://getdibs.pro/dashboard/appointments/new",
};

describe("underWeeklyCap", () => {
  it("allows two marketing emails per rolling week", () => {
    const now = at(10);
    assert.equal(underWeeklyCap([], now), true);
    assert.equal(underWeeklyCap([at(8)], now), true);
    assert.equal(underWeeklyCap([at(8), at(9)], now), false);
    assert.equal(underWeeklyCap([at(2), at(9)], now), true); // day 2 fell out of the week
  });
});

describe("dripEmail", () => {
  it("is niche-specific and ends with the card line", () => {
    const e = dripEmail(base);
    assert.equal(e.subject, "How nail techs ask for deposits without losing regulars");
    assert.ok(e.body.includes("written with your own 24-hour policy"));
    assert.ok(e.body.includes("$0 today, and you're free until Dec 2"));
  });
  it("speaks plainly without a trial", () => {
    assert.ok(dripEmail({ ...base, freeUntil: null }).body.includes("$29/month, cancel anytime"));
  });
  it("gets a 0-hour policy right", () => {
    const e = dripEmail({ ...base, step: "policy", windowHours: 0 });
    assert.ok(e.body.includes("cancel for a refund right up until the appointment starts"));
  });
  it("does the cost math", () => {
    assert.ok(
      dripEmail({ ...base, step: "cost" }).body.includes(
        "One no-show on it costs more than a month",
      ),
    );
    const cheap = dripEmail({
      ...base,
      step: "cost",
      topService: { name: "Lineup", price: "$20", priceCents: 2000 },
    });
    assert.ok(cheap.body.includes("2 no-shows on it cost more than a month"));
    assert.ok(
      dripEmail({ ...base, step: "cost", topService: null }).body.includes(
        "A month of Dibs is $29.",
      ),
    );
  });
  it("falls back to generic copy for other trades", () => {
    assert.equal(
      dripEmail({ ...base, trade: "other" }).subject,
      "How pros ask for deposits without losing regulars",
    );
  });
  it("last email says it's the last and that nothing breaks", () => {
    const e = dripEmail({ ...base, step: "last" });
    assert.equal(e.subject, "Your free days run until Dec 2");
    assert.ok(
      e.body.includes("This is the last of these emails") && e.body.includes("nothing breaks"),
    );
  });
});
