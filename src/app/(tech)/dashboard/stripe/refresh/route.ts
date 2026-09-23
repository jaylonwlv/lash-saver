import { NextResponse, type NextRequest } from "next/server";
import { createOnboardingLink, ensureConnectedAccount } from "@/lib/stripe/connect";
import { getUser } from "@/lib/supabase/server";

/** Stripe sends techs here when an onboarding link expired. Issue a fresh one. */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const accountId = await ensureConnectedAccount(user.id);
    return NextResponse.redirect(await createOnboardingLink(accountId));
  } catch (err) {
    console.error("Stripe onboarding refresh failed", err);
    return NextResponse.redirect(new URL("/dashboard?stripe=error", request.url));
  }
}
