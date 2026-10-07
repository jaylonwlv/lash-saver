import { z } from "zod";
import { instagramHandle, optionalEmail, optionalText } from "@/lib/forms";
import { dollarsToCents } from "@/lib/money";

/** A deposit has to be worth something; $0 pay links aren't a thing. */
export const MIN_APPOINTMENT_DEPOSIT_CENTS = 100;

export const appointmentSchema = z.object({
  service_id: z.uuid("Pick a service."),
  /** Pre-filled from the service; the tech can change it for this client. At most the price (checked in the action). */
  deposit: z
    .string()
    .transform((value, ctx) => {
      const cents = dollarsToCents(value);
      if (cents === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter the deposit in dollars, like 40 or 40.50.",
        });
        return z.NEVER;
      }
      return cents;
    })
    .pipe(z.number().min(MIN_APPOINTMENT_DEPOSIT_CENTS, "The deposit must be at least $1.")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time."),
  client_name: z
    .string()
    .trim()
    .min(1, "Enter the client's name.")
    .max(80, "Keep it under 80 characters."),
  /** Optional: when blank, the client adds their own email on the pay page. */
  client_email: optionalEmail,
  client_phone: optionalText(30),
  client_instagram: instagramHandle,
  notes: optionalText(500),
});

export const appointmentIdSchema = z.uuid();
