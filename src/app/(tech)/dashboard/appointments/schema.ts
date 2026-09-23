import { z } from "zod";
import { instagramHandle, optionalText } from "@/lib/forms";

export const appointmentSchema = z.object({
  service_id: z.uuid("Pick a service."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time."),
  client_name: z
    .string()
    .trim()
    .min(1, "Enter the client's name.")
    .max(80, "Keep it under 80 characters."),
  client_email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.")),
  client_phone: optionalText(30),
  client_instagram: instagramHandle,
  notes: optionalText(500),
});

export const appointmentIdSchema = z.uuid();
