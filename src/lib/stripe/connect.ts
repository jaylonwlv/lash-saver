import "server-only";
import type Stripe from "stripe";
import { publicEnv } from "@/lib/env.public";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./server";

/*
 * Connected accounts use Stripe Accounts v2 (`stripe.v2.core.accounts`); Stripe
 * blocks v1 account creation for new Connect platforms.
 *
 * Each tech's account has the `recipient` configuration with the
 * `stripe_balance.stripe_transfers` capability. That is what destination charges
 * need: the client pays the platform, and the deposit (minus our fee) is
 * transferred to the tech. Express dashboard; the platform pays Stripe fees and
 * covers losses (refunds, disputes).
 */

type V2Account = Stripe.V2.Core.Account;

const ACCOUNT_INCLUDE = ["configuration.recipient", "requirements"] as const;

/** Returns the tech's connected account id, creating the account the first time. */
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
  const account = await getStripe().v2.core.accounts.create(
    {
      contact_email: profile.email,
      display_name: profile.business_name ?? undefined,
      dashboard: "express",
      identity: { country: "us" },
      configuration: {
        recipient: {
          capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
        },
      },
      defaults: {
        currency: "usd",
        responsibilities: { fees_collector: "application", losses_collector: "application" },
        profile: {
          product_description: "Lash extension appointments. Clients pay a deposit to book.",
          // Stripe rejects non-public URLs such as localhost.
          business_url:
            profile.slug && appUrl.startsWith("https://")
              ? `${appUrl}/b/${profile.slug}`
              : undefined,
        },
      },
      metadata: { tech_id: techId },
    },
    { idempotencyKey: `connect-account-v2-${techId}` },
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
  const link = await getStripe().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: `${appUrl}/dashboard/stripe/refresh`,
        return_url: `${appUrl}/dashboard/stripe/return`,
      },
    },
  });
  return link.url;
}

export type AccountStatus = {
  /** The tech can receive deposits (transfers capability is active). */
  ready: boolean;
  /** The tech has nothing left to fill in; Stripe may still be reviewing. */
  detailsSubmitted: boolean;
};

/** Reads onboarding status from a v2 account (retrieved with ACCOUNT_INCLUDE). */
export function accountStatus(account: V2Account): AccountStatus {
  const transfers =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers;
  const userActionDue = (account.requirements?.entries ?? []).some(
    (entry) =>
      entry.awaiting_action_from === "user" &&
      (entry.minimum_deadline.status === "currently_due" ||
        entry.minimum_deadline.status === "past_due"),
  );
  return { ready: transfers?.status === "active", detailsSubmitted: !userActionDue };
}

/**
 * Fetches the account from Stripe and copies its status onto the tech's profile.
 * Safe to repeat. Returns the status it saved.
 */
export async function syncAccountStatus(accountId: string): Promise<AccountStatus> {
  const account = await getStripe().v2.core.accounts.retrieve(accountId, {
    include: [...ACCOUNT_INCLUDE],
  });
  const status = accountStatus(account);

  const { error } = await createAdminClient()
    .from("profiles")
    .update({
      // Column names predate Accounts v2: "charges enabled" means "can receive deposits".
      stripe_charges_enabled: status.ready,
      stripe_details_submitted: status.detailsSubmitted,
    })
    .eq("stripe_account_id", accountId);
  if (error) throw new Error(`Syncing Stripe account ${accountId} failed: ${error.message}`);
  return status;
}

/** Turns a Stripe API error into a message a tech can act on. */
export function stripeErrorMessage(err: unknown): string {
  const type = err instanceof Error && "type" in err ? err.type : undefined;
  if (type === "StripeInvalidRequestError" && err instanceof Error) {
    if (/signed up for Connect|platform profile|business model/i.test(err.message)) {
      return "Stripe Connect isn't set up for this app yet. The app owner needs to finish Connect setup in the Stripe dashboard.";
    }
    return `Stripe said: ${err.message}`;
  }
  return "We couldn't reach Stripe. Try again in a minute.";
}
