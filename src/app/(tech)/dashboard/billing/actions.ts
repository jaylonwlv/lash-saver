"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/forms";
import {
  AlreadySubscribedError,
  billingPortalUrl,
  startSubscriptionCheckout,
} from "@/lib/stripe/billing";
import { stripeErrorMessage } from "@/lib/stripe/connect";
import { createClient, getUser } from "@/lib/supabase/server";

/** Send the tech to Stripe Checkout to add a card and start (or restart) the subscription. */
export async function startSubscription(): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  // Instant sign-ups confirm their email before the trial (and their first pay link).
  const { data: profile } = await (
    await createClient()
  )
    .from("profiles")
    .select("email_confirmed")
    .eq("id", user.id)
    .single();
  if (!profile?.email_confirmed) return { message: "Confirm your email first." };
  let url: string;
  try {
    url = await startSubscriptionCheckout(user.id);
  } catch (err) {
    if (err instanceof AlreadySubscribedError) {
      return { message: "You're already subscribed. Refresh the page to see your plan." };
    }
    console.error("Starting subscription checkout failed", err);
    return { message: stripeErrorMessage(err) };
  }
  redirect(url);
}

/** Stripe's billing portal: change card, invoices, cancel. */
export async function openBillingPortal(): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  let url: string;
  try {
    url = await billingPortalUrl(user.id);
  } catch (err) {
    console.error("Opening billing portal failed", err);
    return { message: stripeErrorMessage(err) };
  }
  redirect(url);
}
