import { z } from "zod";
import { DOMAIN_PLANS, sellableDomain, usPhoneE164 } from "@/lib/domains";

const text = (label: string, max = 100) =>
  z.string().trim().min(1, `Enter your ${label}.`).max(max, "That's too long.");

/** The buy form: the name, the plan, the registrant (the pro, as the domain's owner) and the terms. */
export const domainCheckoutSchema = z.object({
  domain: z.string().transform((v, ctx) => {
    const domain = sellableDomain(v);
    if (!domain) {
      ctx.addIssue({ code: "custom", message: "Pick one of the names above." });
      return z.NEVER;
    }
    return domain;
  }),
  plan: z.enum(DOMAIN_PLANS, { message: "Pick yearly or monthly." }),
  firstName: text("first name", 60),
  lastName: text("last name", 60),
  email: z.email("Enter a valid email."),
  phone: z.string().transform((v, ctx) => {
    const phone = usPhoneE164(v);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Enter a US phone number with area code." });
      return z.NEVER;
    }
    return phone;
  }),
  address1: text("street address"),
  address2: z
    .string()
    .trim()
    .max(100)
    .transform((v) => v || undefined),
  city: text("city", 60),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use the 2-letter state, like NV."),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code."),
  terms: z.literal("on", { message: "Please agree to continue." }),
});
