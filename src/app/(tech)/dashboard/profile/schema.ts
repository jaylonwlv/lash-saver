import { z } from "zod";
import { instagramHandle, optionalText } from "@/lib/forms";
import { TRADE_IDS } from "@/lib/trades";

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/** A menu page link suggested from the business name: "Fresh Cuts & Co." → "fresh-cuts-and-co". */
export function slugFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

/** Must match the checks in supabase/migrations (profiles.slug). */
export const profileSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(1, "Enter your business name.")
    .max(80, "Keep it under 80 characters."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      SLUG_PATTERN,
      "Use 3–40 lowercase letters, numbers or dashes, starting and ending with a letter or number.",
    ),
  instagram_handle: instagramHandle,
  phone: optionalText(30),
  timezone: z
    .string()
    .refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), "Pick a time zone."),
  cancellation_window_hours: z.coerce.number().int().min(0).max(336),
  policy_text: optionalText(1000),
  trade: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(TRADE_IDS).nullable()),
});
