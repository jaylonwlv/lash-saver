/*
 * Why a sign-in failed, as a short code for the /login URL. The raw message from
 * Supabase or the provider is only logged: putting it in the URL would let anyone
 * show their own text on our sign-in page. No server deps (tested).
 */

export const SIGN_IN_ERRORS = {
  provider: "Sign in with Apple or Google isn't working right now. Use your email below.",
  flow: "Start again from this page, in the same browser you finish in.",
  cancelled: "Sign-in was cancelled. Try again, or use your email below.",
  expired: "That sign-in link has expired or was already used. Send yourself a new code below.",
  other: "That sign-in didn't work. Try again, or send yourself a code below.",
} as const;

export type SignInErrorCode = keyof typeof SIGN_IN_ERRORS;

/** Sort a raw error message into one of the codes above. */
export function signInErrorCode(message: string | null | undefined): SignInErrorCode {
  const m = (message ?? "").toLowerCase();
  if (/external code|invalid_client|unauthorized_client|provider/.test(m)) return "provider";
  if (/code verifier|flow state|code challenge|pkce/.test(m)) return "flow";
  if (/access_denied|cancel|denied/.test(m)) return "cancelled";
  if (/expired|otp|token|already/.test(m)) return "expired";
  return "other";
}

/** The message for a code from the URL; anything unknown gets the general one. */
export function signInErrorText(code: unknown): string {
  return typeof code === "string" && Object.hasOwn(SIGN_IN_ERRORS, code)
    ? SIGN_IN_ERRORS[code as SignInErrorCode]
    : SIGN_IN_ERRORS.other;
}
