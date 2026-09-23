import "server-only";
import Stripe from "stripe";
import { APP_NAME } from "@/lib/config";
import { serverEnv } from "@/lib/env";

let stripe: Stripe | undefined;

/**
 * Platform Stripe client. Deposits use destination charges to the tech's
 * Express account with an application fee; see CLAUDE.md "Payments".
 */
export function getStripe(): Stripe {
  stripe ??= new Stripe(serverEnv().STRIPE_SECRET_KEY, {
    appInfo: { name: APP_NAME },
  });
  return stripe;
}
