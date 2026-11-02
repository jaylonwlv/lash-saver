import { z } from "zod";
import { signatureMatches } from "@/lib/catering/agreement";
import { optionalText } from "@/lib/forms";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time.");

/** The host's request from /c/[slug]. The server recalculates every amount. */
export const bookingRequestSchema = z
  .object({
    slug: z.string().min(1).max(60),
    event_date: z.iso.date("Pick a date."),
    start_time: time,
    end_time: time,
    guest_count: z.coerce
      .number()
      .int("Enter a whole number of guests.")
      .min(1, "Enter your guest count.")
      .max(5000),
    package_id: z.uuid("Pick a package."),
    add_on_ids: z.string().transform((v, ctx) => {
      const ids = v ? v.split(",") : [];
      if (ids.length > 50 || !ids.every((id) => z.uuid().safeParse(id).success)) {
        ctx.addIssue({ code: "custom", message: "Check your add-ons." });
        return z.NEVER;
      }
      return ids;
    }),
    event_type: z.enum(
      ["wedding", "corporate", "birthday", "graduation", "other"],
      "Pick the kind of event.",
    ),
    event_address: z
      .string()
      .trim()
      .min(3, "Enter where the event is.")
      .max(300, "Keep it under 300 characters."),
    event_notes: optionalText(1000),
    host_name: z.string().trim().min(1, "Enter your name.").max(100),
    host_email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.")),
    host_phone: z
      .string()
      .trim()
      .max(30)
      .refine((v) => v === "" || /^[+\d][\d\s().-]{6,}$/.test(v), "Enter a valid phone number.")
      .transform((v) => (v === "" ? null : v)),
    signature: z.string().trim().max(100),
    esign: z.literal("on", "Agree to sign electronically to continue."),
    shown_total: z.coerce.number().int().min(1),
    shown_deposit: z.coerce.number().int().min(1),
    /** The owner's date the page priced the quote on (honored until the next day ends). */
    quote_day: z.iso.date(),
    // Honeypot: real people never fill this.
    website: z.literal("").optional(),
  })
  .refine((r) => r.end_time > r.start_time, {
    path: ["end_time"],
    message: "The end time must be after the start.",
  });
