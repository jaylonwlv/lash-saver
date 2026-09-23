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
  /** Platform fee on each deposit, in basis points (100 = 1%). */
  STRIPE_PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10_000).default(0),

  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().min(1),
  EMAIL_REPLY_TO: z.email().optional(),

  CRON_SECRET: z.string().min(16),

  /** Texting provider. "none" disables SMS; "log" prints messages (dev). */
  SMS_PROVIDER: z.enum(["none", "log"]).default("none"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid or missing server env vars: ${keys}. See .env.example.`);
  }
  cached = parsed.data;
  return cached;
}
