import { NextResponse, type NextRequest } from "next/server";
import { syncAccountStatus } from "@/lib/stripe/connect";
import { getStripe } from "@/lib/stripe/server";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Stripe sends techs here after onboarding. Pull the account status now so the
 * dashboard is current; the account.updated webhook keeps it in sync later.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_account_id) {
    try {
      await syncAccountStatus(await getStripe().accounts.retrieve(profile.stripe_account_id));
    } catch (err) {
      // Not fatal: the webhook will catch up.
      console.error("Stripe return sync failed", err);
    }
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
