import { z } from "zod";
import { manualPaymentsSchema } from "@/app/(tech)/dashboard/payments/schema";
import { serviceSchema } from "@/app/(tech)/dashboard/services/schema";
import { TRADE_IDS } from "@/lib/trades";

export const PAY_METHODS = ["cashapp", "zelle", "venmo", "stripe"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

/** Which profile column each payment app's handle goes in. */
export const HANDLE_FIELD = {
  cashapp: "cashapp_tag",
  zelle: "zelle_contact",
  venmo: "venmo_handle",
} as const;

/** Everything the instant sign-up collects, checked again on the server. */
export const startSchema = z
  .object({
    trade: z.enum(TRADE_IDS),
    business_name: z
      .string()
      .trim()
      .min(1, "Enter your business name.")
      .max(80, "Keep it under 80 characters."),
    method: z.enum(PAY_METHODS),
    handle: z.string().trim().max(120).default(""),
    // Only for "Something else", which has no starter menu.
    service_name: z.string().default(""),
    service_price: z.string().default(""),
    service_deposit: z.string().default(""),
    timezone: z
      .string()
      .catch("America/New_York")
      .transform((tz) =>
        Intl.supportedValuesOf("timeZone").includes(tz) ? tz : "America/New_York",
      ),
    email: z.email("Enter a valid email address.").transform((e) => e.trim().toLowerCase()),
    // Hidden from people; bots fill it in.
    website: z.string().max(0).default(""),
  })
  .transform((v, ctx) => {
    let handles: z.infer<typeof manualPaymentsSchema> | null = null;
    if (v.method !== "stripe") {
      const parsed = manualPaymentsSchema.safeParse({
        cashapp_tag: "",
        zelle_contact: "",
        venmo_handle: "",
        [HANDLE_FIELD[v.method]]: v.handle,
      });
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          path: ["handle"],
          message: parsed.error.issues[0]?.message ?? "Check your payment handle.",
        });
        return z.NEVER;
      }
      handles = parsed.data;
    }

    let service: z.infer<typeof serviceSchema> | null = null;
    if (v.trade === "other") {
      const parsed = serviceSchema.safeParse({
        name: v.service_name,
        description: "",
        duration_minutes: 60,
        price: v.service_price,
        deposit: v.service_deposit,
      });
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        ctx.addIssue({
          code: "custom",
          path: [`service_${String(issue?.path[0] ?? "name")}`],
          message: issue?.message ?? "Check your service.",
        });
        return z.NEVER;
      }
      service = parsed.data;
    }

    return { ...v, handles, service };
  });
