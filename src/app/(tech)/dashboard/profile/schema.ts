import { z } from "zod";
import { instagramHandle, optionalText } from "@/lib/forms";
import { isReservedSlug, SLUG_PATTERN } from "@/lib/slugs";
import { TRADE_IDS } from "@/lib/trades";

// Kept here too, for the imports that already use them.
export { SLUG_PATTERN, slugFromName } from "@/lib/slugs";

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
    )
    .refine((slug) => !isReservedSlug(slug), "That link is taken. Try adding your city or name."),
  instagram_handle: instagramHandle,
  phone: optionalText(30),
  timezone: z
    .string()
    .refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), "Pick a time zone."),
  cancellation_window_hours: z.coerce.number().int().min(0).max(720),
  policy_text: optionalText(1000),
  trade: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(TRADE_IDS).nullable()),
});
