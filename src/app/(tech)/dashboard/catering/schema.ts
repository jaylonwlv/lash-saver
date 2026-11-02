import { z } from "zod";
import { optionalText } from "@/lib/forms";
import { dollarsToCents } from "@/lib/money";

/* Must match the checks on the catering_* tables (20261013000000_catering.sql). */

const money = (label: string, { min = 0, max = 10_000_000 } = {}) =>
  z.string().transform((value, ctx) => {
    const cents = dollarsToCents(value);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: `Enter the ${label} in dollars, like 18 or 18.50.` });
      return z.NEVER;
    }
    if (cents < min) {
      ctx.addIssue({ code: "custom", message: `The ${label} must be at least $${min / 100}.` });
      return z.NEVER;
    }
    if (cents > max) {
      ctx.addIssue({ code: "custom", message: `That ${label} is too high.` });
      return z.NEVER;
    }
    return cents;
  });

/** Blank means "not offered" (null). */
const optionalMoney = (label: string) =>
  z.string().transform((value, ctx) => {
    if (value.trim() === "") return null;
    const cents = dollarsToCents(value);
    if (cents === null || cents > 10_000_000) {
      ctx.addIssue({
        code: "custom",
        message: `Enter the ${label} in dollars, or leave it blank.`,
      });
      return z.NEVER;
    }
    return cents;
  });

/** "8.25" (%) → 825 basis points. */
const percentBps = (label: string, maxPercent: number) =>
  z.string().transform((value, ctx) => {
    const v = value.trim() === "" ? "0" : value.trim().replace(/%$/, "");
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(v) || Number(v) > maxPercent) {
      ctx.addIssue({
        code: "custom",
        message: `Enter the ${label} as a percent from 0 to ${maxPercent}.`,
      });
      return z.NEVER;
    }
    return Math.round(Number(v) * 100);
  });

const int = (min: number, max: number, message: string) =>
  z.coerce.number().int(message).min(min, message).max(max, message);

export const pricingTypeSchema = z.enum(["per_person", "flat"]);

export const packageSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(80, "Keep it under 80 characters."),
    description: optionalText(500),
    items_text: optionalText(1000),
    pricing_type: pricingTypeSchema,
    price: money("price", { min: 100 }),
    min_guests: int(1, 5000, "Enter a guest count from 1 to 5,000."),
    max_guests: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (v === "") return null;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 5000) {
          ctx.addIssue({
            code: "custom",
            message: "Enter a guest count from 1 to 5,000, or leave it blank.",
          });
          return z.NEVER;
        }
        return n;
      }),
    included_minutes: int(30, 1440, "Pick how long service lasts."),
  })
  .refine((p) => p.max_guests === null || p.max_guests >= p.min_guests, {
    path: ["max_guests"],
    message: "The most guests can't be fewer than the fewest.",
  })
  .transform(({ price, ...rest }) => ({ ...rest, price_cents: price }));

export const addOnSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(80, "Keep it under 80 characters."),
    description: optionalText(300),
    pricing_type: pricingTypeSchema,
    price: money("price"),
  })
  .transform(({ price, ...rest }) => ({ ...rest, price_cents: price }));

export const settingsSchema = z
  .object({
    cuisine: optionalText(80),
    city: optionalText(80),
    description: optionalText(600),
    policy_text: optionalText(2000),
    minimum_spend: optionalMoney("minimum spend"),
    extra_hour_price: optionalMoney("extra hour price"),
    max_extra_hours: int(0, 12, "Pick from 0 to 12 extra hours."),
    travel_fee: money("travel fee", { max: 1_000_000 }),
    service_fee: percentBps("service fee", 50),
    tax: percentBps("tax rate", 30),
    deposit_type: z.enum(["percent", "flat"]),
    deposit_percent: z.string(),
    deposit_flat: z.string(),
    balance_due_days_before: int(0, 90, "Pick from 0 to 90 days."),
    daily_capacity: int(1, 20, "Pick from 1 to 20 events a day."),
    min_notice_days: int(0, 365, "Pick from 0 to 365 days."),
    max_advance_days: int(7, 730, "Pick from 7 to 730 days."),
  })
  .transform((s, ctx) => {
    let deposit_value: number;
    if (s.deposit_type === "percent") {
      const p = Number(s.deposit_percent.trim().replace(/%$/, ""));
      if (!Number.isFinite(p) || p < 10 || p > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["deposit_percent"],
          message: "Enter a deposit from 10% to 100%.",
        });
        return z.NEVER;
      }
      deposit_value = Math.round(p * 100);
    } else {
      const cents = dollarsToCents(s.deposit_flat);
      if (cents === null || cents < 100) {
        ctx.addIssue({
          code: "custom",
          path: ["deposit_flat"],
          message: "Enter a deposit of at least $1.",
        });
        return z.NEVER;
      }
      deposit_value = cents;
    }
    if (s.min_notice_days >= s.max_advance_days) {
      ctx.addIssue({
        code: "custom",
        path: ["max_advance_days"],
        message: "This must be later than your minimum notice.",
      });
      return z.NEVER;
    }
    return {
      cuisine: s.cuisine,
      city: s.city,
      description: s.description,
      policy_text: s.policy_text,
      minimum_spend_cents: s.minimum_spend,
      extra_hour_price_cents: s.extra_hour_price,
      max_extra_hours: s.max_extra_hours,
      travel_fee_cents: s.travel_fee,
      service_fee_bps: s.service_fee,
      tax_bps: s.tax,
      deposit_type: s.deposit_type,
      deposit_value,
      balance_due_days_before: s.balance_due_days_before,
      daily_capacity: s.daily_capacity,
      min_notice_days: s.min_notice_days,
      max_advance_days: s.max_advance_days,
    };
  });

export const blockedDateSchema = z.object({
  date: z.iso.date("Pick a date."),
  reason: optionalText(200),
});

export const idSchema = z.uuid();
