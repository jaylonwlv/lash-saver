"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/forms";
import {
  createOnboardingLink,
  ensureConnectedAccount,
  stripeErrorMessage,
} from "@/lib/stripe/connect";
import { getStripe } from "@/lib/stripe/server";
import { createClient, getUser } from "@/lib/supabase/server";

/** Creates the tech's Stripe account if needed and sends them to Stripe onboarding. */
export async function startStripeOnboarding(): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");

  let url: string;
  try {
    const accountId = await ensureConnectedAccount(user.id);
    url = await createOnboardingLink(accountId);
  } catch (err) {
    console.error("Stripe onboarding failed", err);
    return { message: stripeErrorMessage(err) };
  }
  redirect(url);
}

/** Opens the tech's Stripe Express dashboard (payouts, balances). */
export async function openStripeDashboard(): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();
  if (!profile?.stripe_account_id) return { message: "Connect Stripe first." };

  let url: string;
  try {
    url = (await getStripe().accounts.createLoginLink(profile.stripe_account_id)).url;
  } catch (err) {
    console.error("Stripe login link failed", err);
    return { message: stripeErrorMessage(err) };
  }
  redirect(url);
}
