"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { createClient, getUser } from "@/lib/supabase/server";
import { TRADE_IDS, tradeById } from "@/lib/trades";

const tradeSchema = z.enum(TRADE_IDS);

/**
 * One tap in setup: remember the trade and, for a pro with no services yet, add
 * that trade's starter menu (marked as examples) and its suggested policy if
 * they haven't written one. "Something else" or "Skip" just records "other".
 */
export async function chooseTrade(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const parsed = tradeSchema.safeParse(formData.get("trade"));
  if (!parsed.success) return { message: "Pick one of the options." };

  const trade = tradeById(parsed.data);
  const timeZone = String(formData.get("timezone") ?? "");
  const validTimeZone = Intl.supportedValuesOf("timeZone").includes(timeZone) ? timeZone : null;
  const supabase = await createClient();
  const [{ data: profile, error: profileError }, { count, error: countError }] = await Promise.all([
    supabase.from("profiles").select("policy_text").eq("id", user.id).single(),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("tech_id", user.id),
  ]);
  if (profileError || countError || !profile) {
    console.error("Loading setup state failed", profileError ?? countError);
    return { message: "Something went wrong. Try again." };
  }

  const usePreset = trade !== null && count === 0;
  // Only the first pick counts: a double tap can't add the starter menu twice.
  const { data: claimed, error: updateError } = await supabase
    .from("profiles")
    .update({
      trade: parsed.data,
      ...(validTimeZone ? { timezone: validTimeZone } : {}),
      ...(usePreset && !profile.policy_text
        ? { cancellation_window_hours: trade.windowHours, policy_text: trade.policyText }
        : {}),
    })
    .eq("id", user.id)
    .is("trade", null)
    .select("id");
  if (updateError) {
    console.error("Saving trade failed", updateError);
    return { message: "Something went wrong. Try again." };
  }
  if (!claimed?.length) redirect("/dashboard");

  if (usePreset) {
    const { error } = await supabase.from("services").insert(
      trade.services.map((service) => ({
        tech_id: user.id,
        name: service.name,
        duration_minutes: service.durationMinutes,
        price_cents: service.priceCents,
        deposit_cents: service.depositCents,
        is_starter: true,
      })),
    );
    if (error) {
      console.error("Adding starter services failed", error);
      return { message: "Saved, but we couldn't add the starter services. Add yours instead." };
    }
  }

  revalidatePath("/dashboard", "layout");
  redirect(usePreset ? "/dashboard/services?starter=1" : "/dashboard");
}
