import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Instant sign-up (/start) creates a pro's account before they prove they own the
 * email. Signing in with a code or link proves it, so the code and link sign-ins
 * call this with the just-signed-in client. Pay links and the trial wait for it
 * (profiles.email_confirmed).
 *
 * The first time it confirms an account, every other session is signed out:
 * whoever typed this email at /start without owning it loses access to the
 * account its real owner has now proven.
 */
export async function markEmailConfirmed(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ email_confirmed: true })
    .eq("id", userId)
    .eq("email_confirmed", false)
    .select("id");
  if (error) {
    console.error(`Marking ${userId}'s email confirmed failed`, error);
    return;
  }
  if (data.length) {
    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
    if (signOutError) console.error(`Signing out ${userId}'s other sessions failed`, signOutError);
  }
}
