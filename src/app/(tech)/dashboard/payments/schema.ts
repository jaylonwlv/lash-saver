import { z } from "zod";

/** Optional text field: empty → null, otherwise normalized and checked. */
function handleField(
  normalize: (v: string) => string,
  valid: (v: string) => boolean,
  message: string,
) {
  return z
    .string()
    .trim()
    .transform((raw, ctx) => {
      if (raw === "") return null;
      const value = normalize(raw);
      if (!valid(value)) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return value;
    });
}

export const manualPaymentsSchema = z
  .object({
    cashapp_tag: handleField(
      (v) => `$${v.replace(/^\$/, "")}`,
      (v) => /^\$[A-Za-z0-9]{1,20}$/.test(v) && /[A-Za-z]/.test(v),
      "Enter your $Cashtag, like $GlowStudio.",
    ),
    zelle_contact: handleField(
      (v) => v,
      (v) =>
        v.length <= 120 && (z.email().safeParse(v).success || v.replace(/\D/g, "").length >= 10),
      "Enter the email or phone number your Zelle uses.",
    ),
    venmo_handle: handleField(
      (v) => v.replace(/^@/, ""),
      (v) => /^[A-Za-z0-9_-]{5,30}$/.test(v),
      "Enter your Venmo username, like @glow-studio.",
    ),
  })
  .refine((v) => v.cashapp_tag || v.zelle_contact || v.venmo_handle, {
    path: ["cashapp_tag"],
    message: "Add at least one way for clients to pay you.",
  });
