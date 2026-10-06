import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Instant sign-up (/start) creates a pro's account before they prove they own the
 * email. Signing in with a code or link proves it, so the code and link sign-ins
 * call this. Pay links and the trial wait for it (profiles.email_confirmed).
 */
export async function markEmailConfirmed(userId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ email_confirmed: true })
    .eq("id", userId)
    .eq("email_confirmed", false);
  if (error) console.error(`Marking ${userId}'s email confirmed failed`, error);
}
