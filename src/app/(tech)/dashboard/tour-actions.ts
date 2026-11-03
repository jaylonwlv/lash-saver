"use server";

import { createClient, getUser } from "@/lib/supabase/server";

/** The pro closed the tour: don't show it again on any device. */
export async function markTourSeen(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ tour_seen_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("tour_seen_at", null);
  // The browser also remembers it, so a failure only means another device may show it once.
  if (error) console.error("Saving tour_seen_at failed", error);
}
