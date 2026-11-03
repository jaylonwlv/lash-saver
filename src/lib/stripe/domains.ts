import "server-only";
import type Stripe from "stripe";
import { DEFAULT_CURRENCY, OWNER_ALERT_EMAIL } from "@/lib/config";
import {
  affordable,
  DOMAIN_MONTHLY_CENTS,
  DOMAIN_PRODUCT_NAME,
  DOMAIN_SETUP_CENTS,
  DOMAIN_YEARLY_CENTS,
  firstChargeCents,
  type DomainPlan,
} from "@/lib/domains";
import { publicEnv } from "@/lib/env.public";
import { formatCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, Tables } from "@/lib/supabase/database.types";
import {
  attachToProject,
  buyDomain,
  detachFromProject,
  orderStatus,
  quoteDomain,
  type Registrant,
  RegistrarError,
  renewDomain,
} from "@/lib/vercel/registrar";
import { stripeCustomerFor } from "./billing";
import { getStripe } from "./server";

/*
 * "Your own website": a yearly or monthly subscription of its own (metadata.kind
 * "domain", never mixed with the Dibs subscription). The domain is bought only after
 * Stripe confirms the first payment (webhook), with the pro as registrant and
 * auto-renew off; the daily cron renews it while the add-on is paid. If registration
 * fails, the payment is refunded and the plan cancelled.
 */

type DomainRow = Tables<"custom_domains">;

/** Dibs plan states that can buy the add-on: the card is on file and passed Stripe. */
const CAN_BUY = new Set(["trialing", "active"]);
/** Renew this long before the domain expires (registrars suspend at expiry). */
const RENEW_DAYS_BEFORE = 30;

export class DomainCheckoutError extends Error {
  constructor(
    readonly reason: "not_eligible" | "has_domain" | "unavailable" | "too_pricey" | "registrar",
  ) {
    super(reason);
  }
}

const dashboardUrl = () => `${publicEnv().NEXT_PUBLIC_APP_URL}/dashboard/domain`;

/**
 * Re-checks the name and price on the server, records what they agreed to, and opens
 * Stripe Checkout. Yearly: $99 now. Monthly: $10 + $15 setup now.
 */
export async function startDomainCheckout(
  techId: string,
  input: { domain: string; plan: DomainPlan; registrant: Registrant },
): Promise<string> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_status")
    .eq("id", techId)
    .single();
  if (!profile || !CAN_BUY.has(profile.subscription_status ?? "")) {
    throw new DomainCheckoutError("not_eligible");
  }
  const { data: existing } = await admin
    .from("custom_domains")
    .select("id, status")
    .eq("tech_id", techId)
    .maybeSingle();
  if (existing && (existing.status === "active" || existing.status === "registering")) {
    throw new DomainCheckoutError("has_domain");
  }

  let quote;
  try {
    quote = await quoteDomain(input.domain);
  } catch (err) {
    console.error("Domain quote failed", err);
    throw new DomainCheckoutError("registrar");
  }
  if (!quote.available) throw new DomainCheckoutError("unavailable");
  if (!affordable(quote.purchaseCents, quote.renewalCents)) {
    throw new DomainCheckoutError("too_pricey");
  }

  const fields = {
    tech_id: techId,
    domain: input.domain,
    plan: input.plan,
    status: "pending" as const,
    purchase_cents: quote.purchaseCents,
    renewal_cents: quote.renewalCents,
    registrant: input.registrant as unknown as Json,
    terms_agreed_at: new Date().toISOString(),
    stripe_checkout_session_id: null,
    stripe_subscription_id: null,
    error: null,
  };
  const { data: row, error } = await admin
    .from("custom_domains")
    .upsert(fields, { onConflict: "tech_id" })
    .select("id, updated_at")
    .single();
  if (error || !row) throw new Error(`Saving domain order failed: ${error?.message}`);

  const customer = await stripeCustomerFor(techId);
  const metadata = { kind: "domain", tech_id: techId, domain_id: row.id, domain: input.domain };
  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: DEFAULT_CURRENCY,
        unit_amount: input.plan === "yearly" ? DOMAIN_YEARLY_CENTS : DOMAIN_MONTHLY_CENTS,
        recurring: { interval: input.plan === "yearly" ? "year" : "month" },
        product_data: { name: `${DOMAIN_PRODUCT_NAME}: ${input.domain}` },
      },
    },
  ];
  if (input.plan === "monthly") {
    // One-time, on the first invoice only: pays for the registration up front.
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: DEFAULT_CURRENCY,
        unit_amount: DOMAIN_SETUP_CENTS,
        product_data: { name: `Setup: registering ${input.domain}` },
      },
    });
  }
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "subscription",
      customer,
      client_reference_id: techId,
      payment_method_types: ["card"],
      line_items: lineItems,
      subscription_data: { metadata },
      metadata,
      success_url: `${appUrl}/dashboard/domain?checkout=done`,
      cancel_url: `${appUrl}/dashboard/domain`,
    },
    // A new attempt (new updated_at) gets a new session; a double tap gets the same one.
    { idempotencyKey: `domain-checkout-${row.id}-${new Date(row.updated_at).getTime()}` },
  );
  await admin
    .from("custom_domains")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", row.id);
  if (!session.url) throw new Error("Stripe didn't return a Checkout URL");
  return session.url;
}

/** Webhook: the first payment went through. Buy the domain. Safe to run twice. */
export async function handleDomainCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const domainId = session.metadata?.domain_id;
  if (!domainId || session.payment_status !== "paid") return;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const { data: claimed } = await createAdminClient()
    .from("custom_domains")
    .update({ status: "registering", stripe_subscription_id: subscriptionId ?? null })
    .eq("id", domainId)
    .eq("stripe_checkout_session_id", session.id)
    .eq("status", "pending")
    .select("*");
  if (claimed?.length) return registerDomain(claimed[0]);

  // Not this row's current checkout: an older tab they paid after starting a new one.
  // Nothing will be registered for it, so give the money back and end that plan.
  const { data: row } = await createAdminClient()
    .from("custom_domains")
    .select("stripe_checkout_session_id, stripe_subscription_id")
    .eq("id", domainId)
    .maybeSingle();
  if (row && row.stripe_checkout_session_id !== session.id && subscriptionId) {
    if (row.stripe_subscription_id === subscriptionId) return;
    const refunded = await refundAndCancel(subscriptionId, `${domainId}-stale`);
    await notify({
      to: { email: OWNER_ALERT_EMAIL },
      template: "domain_alert",
      data: {
        summary: `An older website checkout (${session.metadata?.domain}) was paid after a newer one started. Refunded ${formatCents(refunded)} and cancelled subscription ${subscriptionId}.`,
      },
    });
  }
}

/** Refunds every paid payment on the subscription's latest invoice, then cancels it. */
async function refundAndCancel(subscriptionId: string, key: string): Promise<number> {
  const stripe = getStripe();
  let refunded = 0;
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const invoiceId =
      typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id;
    if (invoiceId) {
      const payments = await stripe.invoicePayments.list({ invoice: invoiceId, status: "paid" });
      for (const p of payments.data) {
        const pi = p.payment.payment_intent;
        const piId = typeof pi === "string" ? pi : pi?.id;
        if (!piId) continue;
        const refund = await stripe.refunds.create(
          { payment_intent: piId, metadata: { kind: "domain" } },
          { idempotencyKey: `domain-refund-${key}-${piId}` },
        );
        refunded += refund.amount;
      }
    }
    if (sub.status !== "canceled") await stripe.subscriptions.cancel(subscriptionId);
  } catch (err) {
    console.error(`Refunding domain subscription ${subscriptionId} failed`, err);
  }
  return refunded;
}

/** Buys the domain and waits briefly for the order; the cron finishes slow ones. */
async function registerDomain(row: DomainRow): Promise<void> {
  if (row.registrar_order_id) return pollRegistration(row);
  const registrant = row.registrant as unknown as Registrant | null;
  if (!registrant || row.purchase_cents === null) {
    return failRegistration(row, "missing registrant or price");
  }
  let orderId: string;
  try {
    orderId = await buyDomain(row.domain, row.purchase_cents, registrant);
  } catch (err) {
    const reason = err instanceof RegistrarError ? (err.code ?? err.message) : String(err);
    return failRegistration(row, `buy failed: ${reason}`);
  }
  const { data: saved } = await createAdminClient()
    .from("custom_domains")
    .update({ registrar_order_id: orderId })
    .eq("id", row.id)
    .select("*")
    .single();
  // Orders usually finish within seconds; give it a moment before leaving it to the cron.
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const { status } = await orderStatus(orderId).catch(() => ({ status: "pending" as const }));
    if (status !== "pending") break;
  }
  await pollRegistration(saved ?? { ...row, registrar_order_id: orderId });
}

async function pollRegistration(row: DomainRow): Promise<void> {
  if (!row.registrar_order_id) return;
  const order = await orderStatus(row.registrar_order_id);
  if (order.status === "pending") return;
  if (order.status !== "completed") {
    return failRegistration(row, `order ${order.status}${order.error ? `: ${order.error}` : ""}`);
  }
  await attachToProject(row.domain);
  const now = new Date();
  const expires = new Date(now);
  expires.setFullYear(expires.getFullYear() + 1);
  const { data: live } = await createAdminClient()
    .from("custom_domains")
    .update({
      status: "active",
      registered_at: now.toISOString(),
      expires_at: expires.toISOString(),
      // Only needed to buy it; the registrar keeps the record from here.
      registrant: null,
    })
    .eq("id", row.id)
    .eq("status", "registering")
    .select("tech_id");
  if (!live?.length) return;
  const email = await proEmail(row.tech_id);
  if (email) {
    await notify({
      to: { email },
      template: "domain_live",
      data: { domain: row.domain, url: `https://${row.domain}`, dashboardUrl: dashboardUrl() },
    });
  }
}

/** Couldn't register it: refund the first payment in full, end the plan, tell everyone. */
async function failRegistration(row: DomainRow, reason: string): Promise<void> {
  const admin = createAdminClient();
  const { data: failed } = await admin
    .from("custom_domains")
    .update({ status: "failed", error: reason.slice(0, 500), registrant: null })
    .eq("id", row.id)
    .in("status", ["registering", "pending"])
    .select("id");
  if (!failed?.length) return;
  console.error(`Domain ${row.domain} for ${row.tech_id} failed: ${reason}`);

  const refunded = row.stripe_subscription_id
    ? await refundAndCancel(row.stripe_subscription_id, row.id)
    : 0;

  const email = await proEmail(row.tech_id);
  if (email && refunded > 0) {
    await notify({
      to: { email },
      template: "domain_failed",
      data: { domain: row.domain, amount: formatCents(refunded), dashboardUrl: dashboardUrl() },
    });
  }
  await notify({
    to: { email: OWNER_ALERT_EMAIL },
    template: "domain_alert",
    data: {
      summary: `Registering ${row.domain} (pro ${row.tech_id}, ${row.plan}) failed: ${reason}. ${
        refunded > 0
          ? `Refunded ${formatCents(refunded)} and cancelled the plan.`
          : `Not refunded automatically: refund ${formatCents(firstChargeCents(row.plan))} in Stripe and cancel subscription ${row.stripe_subscription_id ?? "(none)"}.`
      }`,
    },
  });
}

/** Webhook: the add-on's subscription changed. Ends the website when the plan ends. */
export async function syncDomainSubscription(sub: Stripe.Subscription): Promise<void> {
  const admin = createAdminClient();
  const domainId = sub.metadata?.domain_id;
  const query = admin.from("custom_domains").select("*");
  const { data: row } = await (
    domainId ? query.eq("id", domainId) : query.eq("stripe_subscription_id", sub.id)
  ).maybeSingle();
  if (!row) return;
  const periodEnd = sub.items.data[0]?.current_period_end;
  await admin
    .from("custom_domains")
    .update({
      stripe_subscription_id: sub.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
    })
    .eq("id", row.id);

  const ended = sub.status === "canceled" || sub.status === "unpaid";
  if (ended && row.status === "active") {
    // The registration stays theirs until it expires; we just stop answering on it.
    await detachFromProject(row.domain);
    await admin
      .from("custom_domains")
      .update({ status: "cancelled" })
      .eq("id", row.id)
      .eq("status", "active");
  }
}

/**
 * Daily: finish registrations still pending at the registrar, retry ones the webhook
 * never got to, and renew domains whose add-on is still paid.
 */
export async function runDomainJobs(now: Date): Promise<Record<string, number>> {
  const admin = createAdminClient();
  let finished = 0;
  let renewed = 0;

  const { data: registering } = await admin
    .from("custom_domains")
    .select("*")
    .eq("status", "registering")
    .lt("updated_at", new Date(now.getTime() - 10 * 60_000).toISOString());
  for (const row of registering ?? []) {
    try {
      // An order id means the buy went through; never buy twice.
      await (row.registrar_order_id ? pollRegistration(row) : registerDomain(row));
      finished++;
    } catch (err) {
      console.error(`Finishing domain ${row.id} failed`, err);
    }
  }

  const renewBy = new Date(now.getTime() + RENEW_DAYS_BEFORE * 86_400_000).toISOString();
  const { data: due } = await admin
    .from("custom_domains")
    .select("*")
    .eq("status", "active")
    .eq("cancel_at_period_end", false)
    .lte("expires_at", renewBy);
  for (const row of due ?? []) {
    try {
      if (row.renewal_order_id) {
        // Last run's renewal: done means the year is added; failed needs a person.
        const order = await orderStatus(row.renewal_order_id);
        if (order.status === "pending") continue;
        if (order.status === "completed") {
          const next = new Date(row.expires_at!);
          next.setFullYear(next.getFullYear() + 1);
          await admin
            .from("custom_domains")
            .update({ expires_at: next.toISOString(), renewal_order_id: null })
            .eq("id", row.id);
          renewed++;
          continue;
        }
        await admin.from("custom_domains").update({ renewal_order_id: null }).eq("id", row.id);
        await notify({
          to: { email: OWNER_ALERT_EMAIL },
          template: "domain_alert",
          data: {
            summary: `Renewing ${row.domain} failed (${order.status}${order.error ? `: ${order.error}` : ""}). It expires ${row.expires_at}. The cron will try again tomorrow.`,
          },
        });
        continue;
      }
      // Only while the add-on is paid up (Stripe is retrying a failed charge: wait).
      if (!row.current_period_end || new Date(row.current_period_end) < now) continue;
      const quote = await quoteDomain(row.domain).catch(() => null);
      const price = quote?.renewalCents ?? row.renewal_cents;
      if (price === null) continue;
      const orderId = await renewDomain(row.domain, price);
      await admin
        .from("custom_domains")
        .update({ renewal_order_id: orderId, renewal_cents: price })
        .eq("id", row.id);
    } catch (err) {
      console.error(`Renewing domain ${row.id} failed`, err);
    }
  }
  return { domainsFinished: finished, domainsRenewed: renewed };
}

async function proEmail(techId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("email")
    .eq("id", techId)
    .maybeSingle();
  return data?.email ?? null;
}
