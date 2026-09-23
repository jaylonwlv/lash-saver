import "server-only";
import type Stripe from "stripe";
import {
  APP_NAME,
  DEFAULT_CURRENCY,
  SUBSCRIPTION_NAME,
  SUBSCRIPTION_PRICE_CENTS,
  TRIAL_DAYS,
} from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { formatCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/subscription";
import { getStripe } from "./server";

/*
 * Tech subscriptions on the platform account: $29/month via Stripe Checkout
 * (subscription mode) with a 30-day trial that starts when the tech adds a
 * card. Stripe is the source of truth; syncSubscription copies its state onto
 * the profile. Trial abuse is limited by trial_claims: card and payout-bank
 * fingerprints, normalized email and Instagram handle.
 */

type ClaimKind = "card" | "bank" | "email" | "instagram";
type Claim = { kind: ClaimKind; value: string };

const billingUrl = () => `${publicEnv().NEXT_PUBLIC_APP_URL}/dashboard/billing`;

async function loadProfile(techId: string) {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select(
      "id, email, business_name, instagram_handle, stripe_account_id, stripe_customer_id, subscription_id, subscription_status",
    )
    .eq("id", techId)
    .single();
  if (error || !data) throw new Error(`Profile not found for tech ${techId}`);
  return data;
}

/** The tech's Stripe customer id, created on first use. */
async function ensureCustomer(profile: Awaited<ReturnType<typeof loadProfile>>): Promise<string> {
  if (profile.stripe_customer_id) return profile.stripe_customer_id;
  const customer = await getStripe().customers.create(
    {
      email: profile.email,
      name: profile.business_name ?? undefined,
      metadata: { tech_id: profile.id },
    },
    { idempotencyKey: `customer-${profile.id}` },
  );
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", profile.id)
    .is("stripe_customer_id", null);
  return customer.id;
}

/** Fingerprints of the tech's payout bank accounts. Empty if Stripe won't list them. */
async function bankFingerprints(accountId: string | null): Promise<string[]> {
  if (!accountId) return [];
  try {
    const list = await getStripe().accounts.listExternalAccounts(accountId, {
      object: "bank_account",
      limit: 10,
    });
    return list.data.flatMap((a) =>
      a.object === "bank_account" && a.fingerprint ? [a.fingerprint] : [],
    );
  } catch (err) {
    console.error("Listing payout bank accounts failed; skipping bank check", err);
    return [];
  }
}

async function signals(profile: Awaited<ReturnType<typeof loadProfile>>): Promise<Claim[]> {
  const claims: Claim[] = [{ kind: "email", value: normalizeEmail(profile.email) }];
  if (profile.instagram_handle) {
    claims.push({ kind: "instagram", value: profile.instagram_handle.toLowerCase() });
  }
  for (const fp of await bankFingerprints(profile.stripe_account_id)) {
    claims.push({ kind: "bank", value: fp });
  }
  return claims;
}

/** True if any signal was already used for another tech's trial. */
async function claimedByOthers(techId: string, claims: Claim[]): Promise<boolean> {
  const admin = createAdminClient();
  for (const kind of new Set(claims.map((c) => c.kind))) {
    const values = claims.filter((c) => c.kind === kind).map((c) => c.value);
    const { data } = await admin
      .from("trial_claims")
      .select("id")
      .eq("kind", kind)
      .in("value", values)
      .or(`tech_id.is.null,tech_id.neq.${techId}`)
      .limit(1);
    if (data?.length) return true;
  }
  return false;
}

/** One free trial per tech, and none for a card, bank, email or handle that already had one. */
export async function trialEligible(techId: string): Promise<boolean> {
  const profile = await loadProfile(techId);
  if (profile.subscription_id) return false; // Had a subscription before.
  const { data: own } = await createAdminClient()
    .from("trial_claims")
    .select("id")
    .eq("tech_id", techId)
    .limit(1);
  if (own?.length) return false;
  return !(await claimedByOthers(techId, await signals(profile)));
}

/** Stripe Checkout URL to add a card and start the subscription (with a trial if eligible). */
export async function startSubscriptionCheckout(techId: string): Promise<string> {
  const profile = await loadProfile(techId);
  const customer = await ensureCustomer(profile);
  const withTrial = await trialEligible(techId);
  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: techId,
    payment_method_collection: "always",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: DEFAULT_CURRENCY,
          unit_amount: SUBSCRIPTION_PRICE_CENTS,
          recurring: { interval: "month" },
          product_data: { name: SUBSCRIPTION_NAME },
        },
      },
    ],
    subscription_data: {
      metadata: { tech_id: techId },
      ...(withTrial
        ? {
            trial_period_days: TRIAL_DAYS,
            trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
          }
        : {}),
    },
    metadata: { kind: "subscription", tech_id: techId },
    success_url: `${appUrl}/dashboard/billing/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/billing`,
  });
  if (!session.url) throw new Error(`Checkout session ${session.id} has no URL`);
  return session.url;
}

const toIso = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toISOString() : null;

/** Copies a subscription's state onto the tech's profile. Returns the previous status. */
export async function syncSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const admin = createAdminClient();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const techId = sub.metadata?.tech_id;

  const query = admin.from("profiles").select("id, subscription_id, subscription_status");
  const { data: profile } = await (
    techId ? query.eq("id", techId) : query.eq("stripe_customer_id", customerId)
  ).maybeSingle();
  if (!profile) {
    console.error(`No tech for subscription ${sub.id}`);
    return null;
  }
  // A newer subscription replaced this one; ignore events about the old one.
  if (profile.subscription_id && profile.subscription_id !== sub.id && sub.status === "canceled") {
    return profile.subscription_status;
  }

  const { error } = await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      subscription_id: sub.id,
      subscription_status: sub.status,
      trial_ends_at: toIso(sub.trial_end),
      current_period_end: toIso(sub.items.data[0]?.current_period_end),
      cancel_at_period_end: sub.cancel_at_period_end,
    })
    .eq("id", profile.id);
  if (error) throw new Error(`Syncing subscription ${sub.id} failed: ${error.message}`);
  return profile.subscription_status;
}

/**
 * After the tech adds a card: sync the subscription, and if it's a trial, check
 * the card against earlier trials. A reused card ends the trial now, which
 * charges the first month. Safe to run twice (webhook and return route).
 */
export async function completeSubscriptionCheckout(
  sessionId: string,
  /** When called for a signed-in tech, the session must be theirs. */
  expectedTechId?: string,
): Promise<{ trialRevoked: boolean }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription.default_payment_method"],
  });
  const sub = session.subscription;
  const techId = session.metadata?.tech_id;
  if (!sub || typeof sub === "string" || !techId) return { trialRevoked: false };
  if (expectedTechId && techId !== expectedTechId) return { trialRevoked: false };

  let current = sub;
  let trialRevoked = false;
  const pm = sub.default_payment_method;
  const cardFingerprint =
    typeof pm === "object" && pm?.card?.fingerprint ? pm.card.fingerprint : null;

  if (sub.status === "trialing") {
    const profile = await loadProfile(techId);
    const claims = await signals(profile);
    if (cardFingerprint) claims.push({ kind: "card", value: cardFingerprint });

    if (await claimedByOthers(techId, claims)) {
      current = await stripe.subscriptions.update(sub.id, {
        trial_end: "now",
        proration_behavior: "none",
      });
      trialRevoked = true;
    } else {
      await createAdminClient()
        .from("trial_claims")
        .upsert(
          claims.map((c) => ({ tech_id: techId, kind: c.kind, value: c.value })),
          { onConflict: "tech_id,kind,value", ignoreDuplicates: true },
        );
    }
  }

  await syncSubscription(current);
  return { trialRevoked };
}

/** Stripe customer portal: update card, see invoices, cancel. */
export async function billingPortalUrl(techId: string): Promise<string> {
  const profile = await loadProfile(techId);
  const customer = await ensureCustomer(profile);
  const session = await getStripe().billingPortal.sessions.create({
    customer,
    configuration: await portalConfigurationId(),
    return_url: billingUrl(),
  });
  return session.url;
}

let portalConfigId: string | undefined;

/** Our portal settings, created once in the Stripe account and reused. */
async function portalConfigurationId(): Promise<string> {
  if (portalConfigId) return portalConfigId;
  const stripe = getStripe();
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 20 });
  const ours = existing.data.find((c) => c.metadata?.app === "lash-saver");
  if (ours) return (portalConfigId = ours.id);

  const created = await stripe.billingPortal.configurations.create({
    metadata: { app: "lash-saver" },
    business_profile: { headline: `${APP_NAME}: manage your subscription` },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  });
  return (portalConfigId = created.id);
}

/** Email the tech when a renewal payment fails (status moved to past_due). */
export async function notifyPaymentFailed(sub: Stripe.Subscription): Promise<void> {
  const techId = sub.metadata?.tech_id;
  if (!techId) return;
  const profile = await loadProfile(techId);
  const results = await notify({
    to: { email: profile.email },
    template: "subscription_payment_failed",
    data: { amount: formatCents(SUBSCRIPTION_PRICE_CENTS), billingUrl: billingUrl() },
  });
  for (const r of results) if (!r.ok) console.error("Payment-failed email failed", r.error);
}
