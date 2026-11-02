"use server";

import { redirect } from "next/navigation";
import { readUnsubscribeToken } from "@/lib/unsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setMarketing(token: string, optOut: boolean): Promise<void> {
  const techId = readUnsubscribeToken(token);
  if (!techId) redirect("/unsubscribe");
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ marketing_opt_out_at: optOut ? new Date().toISOString() : null })
    .eq("id", techId);
  if (error) throw new Error(`Updating email preference failed: ${error.message}`);
  redirect(`/unsubscribe?t=${encodeURIComponent(token)}&done=${optOut ? "out" : "in"}`);
}
