import { z } from "zod";
import { instagramHandle, optionalText } from "@/lib/forms";

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

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
});
