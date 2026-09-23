import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env.public";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";

/**
 * Starts or resumes Stripe Express onboarding for the signed-in tech.
 * Returns a one-time onboarding URL to redirect the browser to.
 */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = getStripe();
  const admin = createAdminClient();
  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;

  const { data: profile, error } = await admin
    .from("profiles")
    .select("stripe_account_id, email")
    .eq("id", user.id)
    .single();
  if (error || !profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  let accountId = profile.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create(
      {
        type: "express",
        email: profile.email,
        business_type: "individual",
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { tech_id: user.id },
      },
      { idempotencyKey: `connect-account-${user.id}` },
    );
    accountId = account.id;
    await admin.from("profiles").update({ stripe_account_id: accountId }).eq("id", user.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl}/dashboard?stripe=refresh`,
    return_url: `${appUrl}/dashboard?stripe=return`,
  });

  return NextResponse.json({ url: link.url });
}
