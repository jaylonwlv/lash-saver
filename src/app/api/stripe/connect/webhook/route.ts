import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import { syncAccountStatus } from "@/lib/stripe/connect";
import { getStripe } from "@/lib/stripe/server";

/**
 * Connect webhook: events from techs' connected accounts (onboarding status).
 * The payload is only a trigger; status is re-read from Stripe (Accounts v2)
 * so the stored values never depend on the event's API version.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      serverEnv().STRIPE_CONNECT_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "account.updated":
      await syncAccountStatus(event.data.object.id);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
