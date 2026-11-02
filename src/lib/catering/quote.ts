/*
 * The catering quote: one pure function used by the host's page (live price) and
 * the server (the amount actually charged, recalculated at checkout). Integer
 * cents throughout; percentages are basis points (3000 = 30%). No server deps.
 */

export type PricingType = "per_person" | "flat";

export type QuotePackage = {
  id: string;
  name: string;
  pricing_type: PricingType;
  price_cents: number;
  min_guests: number;
  max_guests: number | null;
  included_minutes: number;
};

export type QuoteAddOn = {
  id: string;
  name: string;
  pricing_type: PricingType;
  price_cents: number;
};

export type QuoteRules = {
  minimum_spend_cents: number | null;
  extra_hour_price_cents: number | null;
  max_extra_hours: number;
  travel_fee_cents: number;
  service_fee_bps: number;
  tax_bps: number;
  deposit_type: "percent" | "flat";
  /** Basis points when percent, cents when flat. */
  deposit_value: number;
};

export type QuoteInput = {
  pkg: QuotePackage;
  addOns: QuoteAddOn[];
  guestCount: number;
  /** Event length in minutes (end minus start). */
  eventMinutes: number;
  rules: QuoteRules;
  /** The event is closer than the balance due date: charge everything now. */
  payInFull: boolean;
};

export type LineItem = { label: string; cents: number };

export type Quote = {
  lines: LineItem[];
  extraHours: number;
  subtotalCents: number;
  travelFeeCents: number;
  serviceFeeCents: number;
  taxCents: number;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  payInFull: boolean;
};

export type QuoteError =
  | { code: "too_few_guests"; min: number }
  | { code: "too_many_guests"; max: number }
  | { code: "too_long"; maxMinutes: number }
  | { code: "bad_input" };

/** a * b / d rounded half up, in integers (no float drift on cents). */
export function mulDivRound(a: number, b: number, d: number): number {
  return Math.floor((2 * a * b + d) / (2 * d));
}

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** "$18 / person" or "$1,500 flat" */
export function priceLabel(pricingType: PricingType, cents: number): string {
  return pricingType === "per_person" ? `${money(cents)} / person` : `${money(cents)} flat`;
}

/** Why a package can't take this many guests, or null if it can. */
export function guestCountProblem(pkg: QuotePackage, guests: number): QuoteError | null {
  if (guests < pkg.min_guests) return { code: "too_few_guests", min: pkg.min_guests };
  if (pkg.max_guests !== null && guests > pkg.max_guests)
    return { code: "too_many_guests", max: pkg.max_guests };
  return null;
}

/** Hours past the package's included time, rounded up to whole hours. */
export function extraHoursFor(eventMinutes: number, includedMinutes: number): number {
  return Math.max(0, Math.ceil((eventMinutes - includedMinutes) / 60));
}

/** Longest event this package allows, in minutes. */
export function maxEventMinutes(pkg: QuotePackage, rules: QuoteRules): number {
  const extra = rules.extra_hour_price_cents === null ? 0 : rules.max_extra_hours;
  return pkg.included_minutes + extra * 60;
}

export function calculateQuote(
  input: QuoteInput,
): { ok: true; quote: Quote } | { ok: false; error: QuoteError } {
  const { pkg, addOns, guestCount, eventMinutes, rules, payInFull } = input;
  if (
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    !Number.isInteger(eventMinutes) ||
    eventMinutes <= 0
  )
    return { ok: false, error: { code: "bad_input" } };
  const guestProblem = guestCountProblem(pkg, guestCount);
  if (guestProblem) return { ok: false, error: guestProblem };
  if (eventMinutes > maxEventMinutes(pkg, rules))
    return { ok: false, error: { code: "too_long", maxMinutes: maxEventMinutes(pkg, rules) } };

  const lines: LineItem[] = [];
  const priced = (type: PricingType, cents: number) =>
    type === "per_person" ? cents * guestCount : cents;

  const packageCost = priced(pkg.pricing_type, pkg.price_cents);
  lines.push({
    label:
      pkg.pricing_type === "per_person"
        ? `${pkg.name} (${guestCount} × ${money(pkg.price_cents)})`
        : pkg.name,
    cents: packageCost,
  });

  let subtotal = packageCost;
  for (const a of addOns) {
    const cost = priced(a.pricing_type, a.price_cents);
    lines.push({
      label:
        a.pricing_type === "per_person"
          ? `${a.name} (${guestCount} × ${money(a.price_cents)})`
          : a.name,
      cents: cost,
    });
    subtotal += cost;
  }

  const extraHours = extraHoursFor(eventMinutes, pkg.included_minutes);
  if (extraHours > 0 && rules.extra_hour_price_cents !== null) {
    const cost = extraHours * rules.extra_hour_price_cents;
    lines.push({
      label: `Extra time (${extraHours} hr × ${money(rules.extra_hour_price_cents)})`,
      cents: cost,
    });
    subtotal += cost;
  }

  if (rules.minimum_spend_cents !== null && subtotal < rules.minimum_spend_cents) {
    lines.push({ label: "Minimum spend adjustment", cents: rules.minimum_spend_cents - subtotal });
    subtotal = rules.minimum_spend_cents;
  }

  const travelFee = rules.travel_fee_cents;
  const serviceFee = mulDivRound(subtotal, rules.service_fee_bps, 10_000);
  // Tax applies to the food and service fee, not travel (MVP rule).
  const tax = mulDivRound(subtotal + serviceFee, rules.tax_bps, 10_000);
  if (travelFee > 0) lines.push({ label: "Travel fee", cents: travelFee });
  if (serviceFee > 0)
    lines.push({ label: `Service fee (${rules.service_fee_bps / 100}%)`, cents: serviceFee });
  if (tax > 0) lines.push({ label: `Tax (${rules.tax_bps / 100}%)`, cents: tax });

  const total = subtotal + travelFee + serviceFee + tax;
  if (total <= 0) return { ok: false, error: { code: "bad_input" } };
  const deposit = payInFull
    ? total
    : Math.max(
        Math.min(total, 100),
        rules.deposit_type === "percent"
          ? mulDivRound(total, rules.deposit_value, 10_000)
          : Math.min(rules.deposit_value, total),
      );

  return {
    ok: true,
    quote: {
      lines,
      extraHours,
      subtotalCents: subtotal,
      travelFeeCents: travelFee,
      serviceFeeCents: serviceFee,
      taxCents: tax,
      totalCents: total,
      depositCents: deposit,
      balanceCents: total - deposit,
      payInFull,
    },
  };
}

/** Host-facing message for a quote error. */
export function quoteErrorMessage(error: QuoteError): string {
  switch (error.code) {
    case "too_few_guests":
      return `This package starts at ${error.min} guests.`;
    case "too_many_guests":
      return `This package is for up to ${error.max} guests.`;
    case "too_long": {
      const h = error.maxMinutes / 60;
      return `Events with this package can run up to ${Number.isInteger(h) ? h : h.toFixed(1)} hours.`;
    }
    case "bad_input":
      return "Check the guest count and times.";
  }
}
