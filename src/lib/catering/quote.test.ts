import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateQuote,
  extraHoursFor,
  mulDivRound,
  priceLabel,
  type QuoteInput,
  type QuoteRules,
} from "./quote";

const rules: QuoteRules = {
  minimum_spend_cents: null,
  extra_hour_price_cents: null,
  max_extra_hours: 3,
  travel_fee_cents: 0,
  service_fee_bps: 0,
  tax_bps: 0,
  deposit_type: "percent",
  deposit_value: 3000,
};
const tacoBar = {
  id: "p1",
  name: "Taco bar",
  pricing_type: "per_person" as const,
  price_cents: 1800,
  min_guests: 30,
  max_guests: 200,
  included_minutes: 120,
};
const base: QuoteInput = {
  pkg: tacoBar,
  addOns: [],
  guestCount: 80,
  eventMinutes: 120,
  rules,
  payInFull: false,
};

function quote(over: Partial<QuoteInput> = {}, r: Partial<QuoteRules> = {}) {
  const res = calculateQuote({ ...base, ...over, rules: { ...rules, ...r } });
  assert.ok(res.ok, `expected a quote, got ${JSON.stringify(!res.ok && res.error)}`);
  return res.quote;
}

describe("calculateQuote", () => {
  it("prices per person and takes a percentage deposit", () => {
    const q = quote();
    assert.equal(q.subtotalCents, 144_000);
    assert.equal(q.totalCents, 144_000);
    assert.equal(q.depositCents, 43_200);
    assert.equal(q.balanceCents, 100_800);
    assert.equal(q.lines[0].label, "Taco bar (80 × $18)");
  });

  it("prices a flat package regardless of guests", () => {
    const q = quote({
      pkg: { ...tacoBar, pricing_type: "flat", price_cents: 150_000, min_guests: 1 },
    });
    assert.equal(q.subtotalCents, 150_000);
  });

  it("adds per-person and flat add-ons", () => {
    const q = quote({
      addOns: [
        { id: "a", name: "Horchata", pricing_type: "per_person", price_cents: 300 },
        { id: "b", name: "Churro cart", pricing_type: "flat", price_cents: 25_000 },
      ],
    });
    assert.equal(q.subtotalCents, 144_000 + 24_000 + 25_000);
  });

  it("charges extra hours, rounded up, only when offered", () => {
    const q = quote({ eventMinutes: 150 }, { extra_hour_price_cents: 20_000 });
    assert.equal(q.extraHours, 1);
    assert.equal(q.subtotalCents, 164_000);
    const tooLong = calculateQuote({ ...base, eventMinutes: 150 });
    assert.deepEqual(!tooLong.ok && tooLong.error, { code: "too_long", maxMinutes: 120 });
    const overMax = calculateQuote({
      ...base,
      eventMinutes: 120 + 4 * 60,
      rules: { ...rules, extra_hour_price_cents: 1 },
    });
    assert.equal(overMax.ok, false);
  });

  it("raises the subtotal to the minimum spend with a visible line", () => {
    const q = quote({ guestCount: 30 }, { minimum_spend_cents: 100_000 });
    assert.equal(q.subtotalCents, 100_000);
    assert.deepEqual(q.lines.at(-1), { label: "Minimum spend adjustment", cents: 46_000 });
  });

  it("adds travel, service fee and tax (tax on subtotal + service fee, not travel)", () => {
    const q = quote({}, { travel_fee_cents: 5_000, service_fee_bps: 1800, tax_bps: 825 });
    assert.equal(q.serviceFeeCents, 25_920);
    assert.equal(q.taxCents, mulDivRound(144_000 + 25_920, 825, 10_000));
    assert.equal(q.taxCents, 14_018); // 14018.4 → 14018
    assert.equal(q.totalCents, 144_000 + 5_000 + 25_920 + 14_018);
    assert.equal(q.depositCents + q.balanceCents, q.totalCents);
  });

  it("rounds half up to whole cents", () => {
    assert.equal(mulDivRound(1, 5000, 10_000), 1); // 0.5 → 1
    assert.equal(mulDivRound(3, 5000, 10_000), 2); // 1.5 → 2
    assert.equal(mulDivRound(1, 4999, 10_000), 0); // 0.4999 → 0
    assert.equal(mulDivRound(12_345, 825, 10_000), 1018); // 1018.4625 → 1018
    assert.equal(mulDivRound(12_346, 825, 10_000), 1019); // 1018.545 → 1019
    // 30% of $1,234.55 = 370.365 → 370.37
    const q = quote({
      pkg: { ...tacoBar, pricing_type: "flat", price_cents: 123_455, min_guests: 1 },
    });
    assert.equal(q.depositCents, 37_037);
  });

  it("caps a flat deposit at the total and keeps at least $1", () => {
    assert.equal(quote({}, { deposit_type: "flat", deposit_value: 50_000 }).depositCents, 50_000);
    assert.equal(
      quote({}, { deposit_type: "flat", deposit_value: 9_999_999 }).depositCents,
      144_000,
    );
    const tiny = quote(
      { guestCount: 1, pkg: { ...tacoBar, min_guests: 1, price_cents: 100 } },
      { deposit_value: 1000 },
    );
    assert.equal(tiny.depositCents, 100);
    assert.equal(tiny.balanceCents, 0);
  });

  it("charges everything up front when the event is inside the balance window", () => {
    const q = quote({ payInFull: true });
    assert.equal(q.depositCents, q.totalCents);
    assert.equal(q.balanceCents, 0);
  });

  it("refuses guest counts outside the package range", () => {
    const few = calculateQuote({ ...base, guestCount: 29 });
    assert.deepEqual(!few.ok && few.error, { code: "too_few_guests", min: 30 });
    const many = calculateQuote({ ...base, guestCount: 201 });
    assert.deepEqual(!many.ok && many.error, { code: "too_many_guests", max: 200 });
    assert.equal(calculateQuote({ ...base, guestCount: 1.5 }).ok, false);
    assert.equal(calculateQuote({ ...base, eventMinutes: 0 }).ok, false);
  });
});

describe("helpers", () => {
  it("extraHoursFor rounds up partial hours", () => {
    assert.equal(extraHoursFor(120, 120), 0);
    assert.equal(extraHoursFor(121, 120), 1);
    assert.equal(extraHoursFor(240, 120), 2);
    assert.equal(extraHoursFor(60, 120), 0);
  });
  it("priceLabel", () => {
    assert.equal(priceLabel("per_person", 1800), "$18 / person");
    assert.equal(priceLabel("flat", 150_000), "$1,500 flat");
    assert.equal(priceLabel("per_person", 1850), "$18.50 / person");
  });
});
