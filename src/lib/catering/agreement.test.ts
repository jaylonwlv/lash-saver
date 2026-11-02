import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAgreement, refundTermsText, signatureMatches } from "./agreement";
import { hostCancelPlan, ownerCancelPlan } from "./refunds";

const base = {
  businessName: "Fuego Tacos",
  hostName: "Ana Ruiz",
  hostEmail: "ana@example.com",
  eventDate: "2027-06-14",
  startTime: "17:00",
  endTime: "19:00",
  eventAddress: "1 Main St, San Diego",
  guestCount: 80,
  lines: [{ label: "Taco bar (80 × $18)", cents: 144_000 }],
  totalCents: 144_000,
  depositCents: 43_200,
  balanceCents: 100_800,
  balanceDueDate: "2027-06-07",
  refund: { host_can_cancel: true, full_refund_days: 30 },
  policyText: "Final count due 7 days before.",
  contractTerms: "Host provides a level parking spot.",
};

describe("agreement", () => {
  it("includes the event, price, schedule, refunds, policy and terms", () => {
    const text = buildAgreement(base);
    for (const s of [
      "Between Fuego Tacos",
      "Ana Ruiz (ana@example.com)",
      "Monday, June 14, 2027, 5:00 PM to 7:00 PM",
      "80 guests",
      "Taco bar (80 × $18): $1,440.00",
      "A $432.00 deposit is paid at booking",
      "$1,008.00 balance is due by Monday, June 7, 2027",
      "At least 30 days before the event",
      "Final count due 7 days before.",
      "ADDITIONAL TERMS\nHost provides a level parking spot.",
      "ELECTRONIC SIGNATURE",
    ])
      assert.ok(text.includes(s), `missing: ${s}`);
  });

  it("describes paid-in-full and no-online-cancel cases", () => {
    const text = buildAgreement({
      ...base,
      depositCents: 144_000,
      balanceCents: 0,
      balanceDueDate: null,
      contractTerms: null,
      policyText: null,
    });
    assert.ok(text.includes("The full $1,440.00 is paid at booking."));
    assert.ok(!text.includes("ADDITIONAL TERMS") && !text.includes("POLICY"));
    assert.ok(
      refundTermsText({ host_can_cancel: false, full_refund_days: 30 }, "X").startsWith(
        "To cancel, contact X",
      ),
    );
  });

  it("matches the signature to the host's name", () => {
    assert.equal(signatureMatches("  ana   RUIZ ", "Ana Ruiz"), true);
    assert.equal(signatureMatches("Ana", "Ana Ruiz"), false);
    assert.equal(signatureMatches("", ""), false);
  });
});

const paid = [
  { id: "d", kind: "deposit" as const, amount_cents: 43_200 },
  { id: "b", kind: "balance" as const, amount_cents: 100_800 },
];
const terms = { host_can_cancel: true, full_refund_days: 30, event_date: "2027-06-14" };

describe("refund plans", () => {
  it("owner cancellation refunds everything", () => {
    assert.equal(ownerCancelPlan(paid).refundCents, 144_000);
  });
  it("host gets a full refund at least N days before", () => {
    const p = hostCancelPlan(terms, paid, "2027-05-15"); // 30 days before
    assert.equal(p?.refundCents, 144_000);
    assert.equal(p?.keptCents, 0);
  });
  it("inside N days the deposit is kept and the balance refunded", () => {
    const p = hostCancelPlan(terms, paid, "2027-05-16"); // 29 days before
    assert.deepEqual(
      p?.keep.map((x) => x.id),
      ["d"],
    );
    assert.equal(p?.refundCents, 100_800);
    assert.equal(hostCancelPlan(terms, [paid[0]], "2027-06-10")?.refundCents, 0);
  });
  it("no online cancel when turned off or after the event", () => {
    assert.equal(hostCancelPlan({ ...terms, host_can_cancel: false }, paid, "2027-05-01"), null);
    assert.equal(hostCancelPlan(terms, paid, "2027-06-15"), null);
    assert.equal(
      hostCancelPlan({ ...terms, full_refund_days: 0 }, paid, "2027-06-14")?.refundCents,
      144_000,
    );
  });
});
