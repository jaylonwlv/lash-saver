import { z } from "zod";

/**
 * Public env, safe for the browser. Each key must be referenced literally
 * (process.env.NEXT_PUBLIC_X) so Next.js can inline it at build time.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  /** Meta Pixel for ad measurement. Optional: empty or unset turns it off. */
  NEXT_PUBLIC_META_PIXEL_ID: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z
      .string()
      .regex(/^\d{5,20}$/)
      .optional(),
  ),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let cached: PublicEnv | undefined;

export function publicEnv(): PublicEnv {
  if (cached) return cached;
  const raw: Record<keyof PublicEnv, string | undefined> = {
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  };
  const parsed = publicSchema.safeParse(raw);
  if (!parsed.success) {
    const keys = parsed.error.issues
      .map((i) => {
        const key = i.path.join(".") as keyof PublicEnv;
        return `${key} (${raw[key] ? "invalid" : "missing"})`;
      })
      .join(", ");
    throw new Error(`Invalid or missing public env vars: ${keys}. See .env.example.`);
  }
  cached = parsed.data;
  return cached;
}
