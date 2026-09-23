import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env.public";
import { serverEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Secret-key client that BYPASSES RLS. Use only in trusted server code that
 * has no signed-in user: Stripe webhooks, cron jobs, public booking writes
 * after server-side validation. Never import from a Client Component.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv().NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
