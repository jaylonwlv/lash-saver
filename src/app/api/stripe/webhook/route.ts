import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import {
  completeSubscriptionCheckout,
  notifyPaymentFailed,
  syncSubscription,
} from "@/lib/stripe/billing";
import {
  handleChargeRefunded,
  handleCheckoutCompleted,
  handleCheckoutExpired,
} from "@/lib/stripe/deposits";
import {
  handleDisputeClosed,
  handleDisputeCreated,
  handleDisputeFundsReinstated,
  handleDisputeFundsWithdrawn,
} from "@/lib/stripe/disputes";
import { getStripe } from "@/lib/stripe/server";
import { trackSubscription } from "@/lib/meta";

/**
 * Platform webhook. This is the source of truth for deposit status:
 * never mark a deposit paid from a redirect or client callback.
 * Handlers must be idempotent (Stripe retries).
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      serverEnv().STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      if (event.data.object.mode === "subscription") {
        await completeSubscriptionCheckout(event.data.object.id);
      } else {
        await handleCheckoutCompleted(event.data.object);
      }
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const previous = await syncSubscription(sub);
      if (sub.status === "past_due" && previous !== "past_due") await notifyPaymentFailed(sub);
      // First paid period after the trial: the conversion ads should optimize for.
      if (sub.status === "active" && previous === "trialing" && sub.metadata?.tech_id) {
        await trackSubscription("Subscribe", sub.metadata.tech_id, sub.id, { browser: false });
      }
      break;
    }
    case "checkout.session.expired":
      await handleCheckoutExpired(event.data.object);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object);
      break;
    case "charge.dispute.created":
      await handleDisputeCreated(event.data.object);
      break;
    case "charge.dispute.funds_withdrawn":
      await handleDisputeFundsWithdrawn(event.data.object);
      break;
    case "charge.dispute.funds_reinstated":
      await handleDisputeFundsReinstated(event.data.object);
      break;
    case "charge.dispute.closed":
      await handleDisputeClosed(event.data.object);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
