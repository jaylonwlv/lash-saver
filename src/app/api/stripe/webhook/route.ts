import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import {
  handleChargeRefunded,
  handleCheckoutCompleted,
  handleCheckoutExpired,
} from "@/lib/stripe/deposits";
import { getStripe } from "@/lib/stripe/server";

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
      await handleCheckoutCompleted(event.data.object);
      break;
    case "checkout.session.expired":
      await handleCheckoutExpired(event.data.object);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
