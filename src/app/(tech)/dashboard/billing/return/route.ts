import { NextResponse, type NextRequest } from "next/server";
import { completeSubscriptionCheckout } from "@/lib/stripe/billing";
import { getUser } from "@/lib/supabase/server";

/**
 * Stripe Checkout sends the tech here after adding a card. Sync right away so
 * they can create a pay link without waiting for the webhook.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const sessionId = request.nextUrl.searchParams.get("session_id");
  let revoked = false;
  if (sessionId?.startsWith("cs_")) {
    try {
      revoked = (await completeSubscriptionCheckout(sessionId, user.id)).trialRevoked;
    } catch (err) {
      // Not fatal: the webhook will sync it.
      console.error("Subscription return sync failed", err);
    }
  }
  const next = new URL("/dashboard/appointments/new", request.url);
  next.searchParams.set("billing", revoked ? "no-trial" : "started");
  return NextResponse.redirect(next);
}
