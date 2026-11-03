import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands a handoff link (createHandoffLink) in the pro's real browser: signs them
 * in and opens the dashboard. Unlike /auth/callback it doesn't mark the email
 * confirmed: the link came from a signed-in session, not from their inbox.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (!error) return NextResponse.redirect(new URL("/dashboard", origin));
    console.error("Handoff sign-in failed:", error.message);
  }
  // Used already or expired: signing in normally still works.
  return NextResponse.redirect(new URL("/login?error=link&reason=expired", origin));
}
