"use server";

import { publicEnv } from "@/lib/env.public";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";

/**
 * A one-time sign-in link for leaving Instagram's browser: made the moment the
 * signed-in pro taps "Open in Safari / Chrome", so their real browser opens
 * Dibs already signed in instead of asking for an email code. Single use, and
 * it expires with Supabase's email OTP lifetime. It lands on /auth/handoff,
 * which (unlike an emailed link) doesn't count as proving the inbox.
 */
export async function createHandoffLink(): Promise<string | null> {
  const user = await getUser();
  if (!user?.email) return null;
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });
  const hash = data?.properties?.hashed_token;
  if (error || !hash) {
    console.error("Making a handoff link failed", error);
    return null;
  }
  const url = new URL("/auth/handoff", publicEnv().NEXT_PUBLIC_APP_URL);
  url.search = new URLSearchParams({ token_hash: hash }).toString();
  return url.toString();
}
