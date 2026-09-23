import "server-only";
import type Stripe from "stripe";
import { publicEnv } from "@/lib/env.public";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./server";

/** Merchant category code for "Barber and Beauty Shops". Pre-fills Stripe onboarding. */
const BEAUTY_SHOP_MCC = "7230";

/**
 * Returns the tech's connected account id, creating an Express-style account
 * (Stripe-hosted onboarding, Express dashboard, platform pays fees and covers
 * losses) the first time.
 */
export async function ensureConnectedAccount(techId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("email, business_name, slug, stripe_account_id")
    .eq("id", techId)
    .single();
  if (error || !profile) throw new Error(`Profile not found for tech ${techId}`);
  if (profile.stripe_account_id) return profile.stripe_account_id;

  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const account = await getStripe().accounts.create(
    {
      email: profile.email,
      controller: {
        stripe_dashboard: { type: "express" },
        fees: { payer: "application" },
        losses: { payments: "application" },
        requirement_collection: "stripe",
      },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_profile: {
        mcc: BEAUTY_SHOP_MCC,
        name: profile.business_name ?? undefined,
        product_description: "Lash extension appointments. Clients pay a deposit to book.",
        // Stripe rejects non-public URLs such as localhost.
        url:
          profile.slug && appUrl.startsWith("https://") ? `${appUrl}/b/${profile.slug}` : undefined,
      },
      metadata: { tech_id: techId },
    },
    { idempotencyKey: `connect-account-${techId}` },
  );

  // Only set it if still empty, so a concurrent request can't overwrite it.
  const { error: updateError } = await admin
    .from("profiles")
    .update({ stripe_account_id: account.id })
    .eq("id", techId)
    .is("stripe_account_id", null);
  if (updateError) throw new Error(`Saving Stripe account failed: ${updateError.message}`);

  return account.id;
}

/** A one-time link to Stripe-hosted onboarding. Links expire after a few minutes. */
export async function createOnboardingLink(accountId: string): Promise<string> {
  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const link = await getStripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl}/dashboard/stripe/refresh`,
    return_url: `${appUrl}/dashboard/stripe/return`,
  });
  return link.url;
}

/** Copies onboarding status from Stripe onto the tech's profile. Safe to repeat. */
export async function syncAccountStatus(account: Stripe.Account): Promise<void> {
  const { error } = await createAdminClient()
    .from("profiles")
    .update({
      stripe_charges_enabled: account.charges_enabled,
      stripe_details_submitted: account.details_submitted,
    })
    .eq("stripe_account_id", account.id);
  if (error) throw new Error(`Syncing Stripe account ${account.id} failed: ${error.message}`);
}

/** Turns a Stripe API error into a message a tech can act on. */
export function stripeErrorMessage(err: unknown): string {
  const type = err instanceof Error && "type" in err ? err.type : undefined;
  if (type === "StripeInvalidRequestError" && err instanceof Error) {
    if (/signed up for Connect|platform profile/i.test(err.message)) {
      return "Stripe Connect isn't set up for this app yet. The app owner needs to finish Connect setup in the Stripe dashboard.";
    }
    return `Stripe said: ${err.message}`;
  }
  return "We couldn't reach Stripe. Try again in a minute.";
}
