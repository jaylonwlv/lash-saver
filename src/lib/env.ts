import "server-only";
import { z } from "zod";

/**
 * Server-only environment. Validated lazily on first access so `next build`
 * works without secrets, but any request touching a missing key fails loudly.
 * Public (NEXT_PUBLIC_*) values live in `env.public.ts`.
 */
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),

  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().startsWith("whsec_"),

  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().min(1),
  // Optional: an empty value counts as unset.
  EMAIL_REPLY_TO: z.preprocess((v) => (v === "" ? undefined : v), z.email().optional()),

  CRON_SECRET: z.string().min(16),

  // Meta Conversions API (optional; empty counts as unset). Needs NEXT_PUBLIC_META_PIXEL_ID too.
  META_CAPI_TOKEN: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(20).optional()),
  // Set while testing in Events Manager → Test events; remove afterwards.
  META_TEST_EVENT_CODE: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),

  /** Texting provider. "none" disables SMS; "log" prints messages (dev). */
  SMS_PROVIDER: z.enum(["none", "log"]).default("none"),
});

/** "KEY (missing)" or "KEY (invalid)" for each failing key, so logs say what to fix. */
function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => {
      const key = i.path.join(".");
      const value = process.env[key];
      return `${key} (${value === undefined || value === "" ? "missing" : "invalid"})`;
    })
    .join(", ");
}

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid or missing server env vars: ${describeIssues(parsed.error)}. See .env.example.`,
    );
  }
  cached = parsed.data;
  return cached;
}
