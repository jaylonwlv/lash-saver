import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { publicEnv } from "@/lib/env.public";

let stripePromise: Promise<Stripe | null> | undefined;

/** Browser Stripe.js, loaded once. Only needed for embedded Stripe UI. */
export function getStripeJs() {
  stripePromise ??= loadStripe(publicEnv().NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}
