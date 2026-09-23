"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/forms";
import { billingPortalUrl, startSubscriptionCheckout } from "@/lib/stripe/billing";
import { stripeErrorMessage } from "@/lib/stripe/connect";
import { getUser } from "@/lib/supabase/server";

/** Send the tech to Stripe Checkout to add a card and start (or restart) the subscription. */
export async function startSubscription(): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  let url: string;
  try {
    url = await startSubscriptionCheckout(user.id);
  } catch (err) {
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
