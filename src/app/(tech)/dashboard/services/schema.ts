import { z } from "zod";
import { optionalText } from "@/lib/forms";
import { dollarsToCents } from "@/lib/money";

/** Stripe's minimum card charge in USD. */
const MIN_DEPOSIT_CENTS = 50;
const MAX_PRICE_CENTS = 1_000_000;

const money = (label: string) =>
  z.string().transform((value, ctx) => {
    const cents = dollarsToCents(value);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: `Enter the ${label} in dollars, like 45 or 45.50.` });
      return z.NEVER;
    }
    return cents;
  });

/** Must match the checks on public.services in supabase/migrations. */
export const serviceSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(80, "Keep it under 80 characters."),
    description: optionalText(500),
    duration_minutes: z.coerce.number().int().min(5).max(600),
    price: money("price").pipe(z.number().max(MAX_PRICE_CENTS, "That price is too high.")),
    deposit: money("deposit").pipe(
      z.number().min(MIN_DEPOSIT_CENTS, "The deposit must be at least $0.50."),
    ),
  })
  .refine((s) => s.deposit <= s.price, {
    path: ["deposit"],
    message: "The deposit can't be more than the price.",
  })
  .transform(({ price, deposit, ...rest }) => ({
    ...rest,
    price_cents: price,
    deposit_cents: deposit,
  }));

export const serviceIdSchema = z.uuid();
