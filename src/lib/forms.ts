import { z } from "zod";

/**
 * Return type for Server Actions used with `useActionState`. `values` echoes the
 * submitted fields back, because React resets uncontrolled inputs after an
 * action; forms use it as `defaultValue` so a failed submit keeps what was typed.
 */
export type FormState = {
  errors?: Record<string, string>;
  values?: Record<string, string>;
  message?: string;
};

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

/** First error message per field, keyed by field name. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Empty strings from optional form fields become null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v));

/** Optional Instagram handle: strips a leading "@", validates, empty becomes null. */
export const instagramHandle = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, ""))
  .refine(
    (v) => v === "" || /^[A-Za-z0-9._]{1,30}$/.test(v),
    "That isn't a valid Instagram handle.",
  )
  .transform((v) => (v === "" ? null : v));
