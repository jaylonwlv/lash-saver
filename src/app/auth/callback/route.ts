import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { markEmailConfirmed } from "@/lib/email-confirmed";
import { trackSignUp } from "@/lib/meta";
import { safeNextPath } from "@/lib/redirects";
import { signInErrorCode } from "@/lib/sign-in-errors";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly string[] = ["email", "magiclink", "signup", "invite", "recovery"];

/**
 * Sign-in link landing. The email link carries a `token_hash`, which works in
 * any browser (phones often open mail links in a different browser than the one
 * that asked). A PKCE `code` only works in the browser that asked, so it's
 * kept as a fallback for the default email template.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const supabase = await createClient();
  let failure: string | null = null;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      if (data.user)
        await Promise.all([markEmailConfirmed(supabase, data.user.id), trackSignUp(data.user)]);
      return NextResponse.redirect(new URL(next, origin));
    }
    failure = error.message;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user)
        await Promise.all([markEmailConfirmed(supabase, data.user.id), trackSignUp(data.user)]);
      return NextResponse.redirect(new URL(next, origin));
    }
    // Most often: the sign-in started on another address (its code check is in that
    // browser's cookies), or the provider's settings in Supabase are wrong.
    failure = error.message;
  } else if (searchParams.get("error_description")) {
    failure = searchParams.get("error_description");
  }
  if (failure) console.error("Sign-in callback failed:", failure);

  const failed = new URL("/login", origin);
  failed.searchParams.set("error", "link");
  failed.searchParams.set("reason", signInErrorCode(failure));
  return NextResponse.redirect(failed);
}
