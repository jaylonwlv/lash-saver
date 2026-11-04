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
import { notifyOnce } from "@/lib/notifications/log";
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
  renewalPriceCents,
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
 * Stripe Checkout. Yearly: $99 now. Monthly: $15 + $25 setup now.
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
    // A new attempt starts clean: nothing from an earlier, ended domain may carry over
    // (an old order id would make the webhook "finish" a purchase that never happened).
    stripe_checkout_session_id: null,
    stripe_subscription_id: null,
    current_period_end: null,
    cancel_at_period_end: false,
    registrar_order_id: null,
    renewal_order_id: null,
    registered_at: null,
    expires_at: null,
    verified_at: null,
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
  if (claimed?.length) {
    // Subscription events can arrive before this one and are ignored until the row
    // knows its subscription, so copy the period now.
    if (subscriptionId) {
      await getStripe()
        .subscriptions.retrieve(subscriptionId)
        .then(syncDomainSubscription)
        .catch((err: unknown) => console.error(`Syncing domain subscription failed`, err));
    }
    return registerDomain(claimed[0]);
  }

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
    const reason = err instanceof RegistrarError ? err.message : String(err);
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
  if (order.status === "pending") {
    // Still buying. The hourly cron checks again; tell the owner if it's taking far too long.
    if (Date.now() - new Date(row.updated_at).getTime() > 6 * 3_600_000) {
      await notifyOnce(`domain_slow:${row.id}`, {
        to: { email: OWNER_ALERT_EMAIL },
        template: "domain_alert",
        data: {
          summary: `Registering ${row.domain} has been in progress for over 6 hours (order ${row.registrar_order_id}, ${order.raw}). Check Vercel → Domains.`,
        },
      });
    }
    return;
  }
  if (order.status === "failed") {
    return failRegistration(row, `order ${order.raw}${order.error ? `: ${order.error}` : ""}`);
  }
  const admin = createAdminClient();
  // Registered: theirs from here, even before it's connected (the progress page ticks this).
  if (!row.registered_at) {
    const now = new Date();
    const expires = new Date(now);
    expires.setFullYear(expires.getFullYear() + 1);
    await admin
      .from("custom_domains")
      .update({
        registered_at: now.toISOString(),
        expires_at: expires.toISOString(),
        // Only needed to buy it; the registrar keeps the record from here.
        registrant: null,
      })
      .eq("id", row.id)
      .is("registered_at", null);
  }
  await attachToProject(row.domain);
  const { data: connected } = await admin
    .from("custom_domains")
    .update({ status: "active" })
    .eq("id", row.id)
    .eq("status", "registering")
    .select("*");
  if (!connected?.length) return;
  const pro = await proContact(row.tech_id);
  if (pro.email) {
    // Not "live" yet: the new address takes a while to reach every network. That email
    // waits for verifyDomain, which checks the domain really opens the page.
    await notifyOnce(`domain_registered:${row.id}`, {
      to: { email: pro.email },
      template: "domain_registered",
      data: {
        domain: row.domain,
        pageUrl: pro.slug
          ? `${publicEnv().NEXT_PUBLIC_APP_URL.replace(/^https?:\/\//, "")}/${pro.slug}`
          : null,
        dashboardUrl: dashboardUrl(),
      },
    });
  }
  await verifyDomain(connected[0]);
}

/**
 * Does https://<domain> really reach this app yet? Dibs asks it for /api/domain-check,
 * as a client's phone would (DNS, certificate, routing). The first time it answers,
 * the domain is marked verified and the pro gets "Your website is live". Never throws.
 */
export async function verifyDomain(row: DomainRow): Promise<boolean> {
  if (row.verified_at) return true;
  if (row.status !== "active") return false;
  let ok = false;
  try {
    const res = await fetch(`https://${row.domain}/api/domain-check`, {
      cache: "no-store",
      // Follow redirects (an apex → www redirect still opens the page): the check
      // answers ok only on a pro's live domain, so a hop to the app itself fails it.
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    const body: unknown = res.ok ? await res.json() : null;
    ok = Boolean(body && typeof body === "object" && "ok" in body && body.ok === true);
  } catch {
    ok = false; // Not resolving yet, no certificate yet, or slow: try again later.
  }
  if (!ok) return false;
  const { data: verified } = await createAdminClient()
    .from("custom_domains")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("verified_at", null)
    .select("tech_id");
  if (verified?.length) {
    const pro = await proContact(row.tech_id);
    if (pro.email) {
      await notifyOnce(`domain_live:${row.id}`, {
        to: { email: pro.email },
        template: "domain_live",
        data: { domain: row.domain, url: `https://${row.domain}`, dashboardUrl: dashboardUrl() },
      });
    }
  }
  return true;
}

export type DomainProgress = {
  domain: string;
  status: DomainRow["status"];
  paid: boolean;
  registered: boolean;
  connected: boolean;
  live: boolean;
};

/**
 * The progress page's refresh: nudges the purchase along (the order check and the live
 * check the cron would otherwise do hourly) and reports where it stands. Never buys:
 * only an order that already exists is checked.
 */
export async function advanceDomain(techId: string): Promise<DomainProgress | null> {
  const admin = createAdminClient();
  const load = async () =>
    (await admin.from("custom_domains").select("*").eq("tech_id", techId).maybeSingle()).data;
  let row = await load();
  if (!row) return null;
  try {
    if (row.status === "registering" && row.registrar_order_id) await pollRegistration(row);
    else if (row.status === "active" && !row.verified_at) await verifyDomain(row);
  } catch (err) {
    console.error(`Advancing domain ${row.id} failed`, err);
  }
  row = (await load()) ?? row;
  return {
    domain: row.domain,
    status: row.status,
    paid: row.status === "registering" || row.status === "active",
    registered: Boolean(row.registered_at),
    connected: row.status === "active",
    live: Boolean(row.verified_at),
  };
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
  // Only the row's own subscription (set when its checkout is paid) may change it: a
  // stale checkout's subscription, cancelled by us, must never take a live site down.
  if (!row || row.stripe_subscription_id !== sub.id) return;
  const periodEnd = sub.items.data[0]?.current_period_end;
  await admin
    .from("custom_domains")
    .update({
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
 * Hourly: finish registrations still pending at the registrar, retry ones the webhook
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

  // Connected but not confirmed opening yet: check again, and flag anything stuck a day.
  const { data: unverified } = await admin
    .from("custom_domains")
    .select("*")
    .eq("status", "active")
    .is("verified_at", null);
  for (const row of unverified ?? []) {
    const ok = await verifyDomain(row);
    if (
      !ok &&
      row.registered_at &&
      now.getTime() - new Date(row.registered_at).getTime() > 86_400_000
    ) {
      await notifyOnce(`domain_unverified:${row.id}`, {
        to: { email: OWNER_ALERT_EMAIL },
        template: "domain_alert",
        data: {
          summary: `${row.domain} was registered and connected over a day ago but still doesn't open the pro's page. Check Vercel → lash-saver → Domains, and that https://${row.domain}/api/domain-check answers ok: true.`,
        },
      });
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
        await notifyOnce(`domain_renew_failed:${row.id}:${row.expires_at}`, {
          to: { email: OWNER_ALERT_EMAIL },
          template: "domain_alert",
          data: {
            summary: `Renewing ${row.domain} failed (${order.raw}${order.error ? `: ${order.error}` : ""}). It expires ${row.expires_at}; the cron keeps retrying every hour.`,
          },
        });
        continue;
      }
      // Only while the add-on is paid up (Stripe is retrying a failed charge: wait).
      if (!row.current_period_end || new Date(row.current_period_end) < now) continue;
      // Our own domain shows as "taken", so ask for its price directly.
      const price = (await renewalPriceCents(row.domain).catch(() => null)) ?? row.renewal_cents;
      if (price === null) continue;
      let orderId: string;
      try {
        orderId = await renewDomain(row.domain, price);
      } catch (err) {
        // A price change or a registrar error: tell the owner once per expiry, retry hourly.
        await notifyOnce(`domain_renew_failed:${row.id}:${row.expires_at}`, {
          to: { email: OWNER_ALERT_EMAIL },
          template: "domain_alert",
          data: {
            summary: `Renewing ${row.domain} failed (${err instanceof Error ? err.message : String(err)}). It expires ${row.expires_at}; the cron keeps retrying every hour.`,
          },
        });
        continue;
      }
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

async function proContact(techId: string): Promise<{ email: string | null; slug: string | null }> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("email, slug")
    .eq("id", techId)
    .maybeSingle();
  return { email: data?.email ?? null, slug: data?.slug ?? null };
}

async function proEmail(techId: string): Promise<string | null> {
  return (await proContact(techId)).email;
}
