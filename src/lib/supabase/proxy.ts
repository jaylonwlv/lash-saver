import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const PROTECTED_PREFIXES = ["/dashboard"];

/**
 * Refreshes the Supabase auth session on every matched request and
 * redirects signed-out users away from tech-only routes.
 */
export async function updateSession(request: NextRequest) {
  // If Supabase rejects the redirect URL it falls back to the Site URL (usually "/"),
  // with the auth code or error attached. Route those to the callback / login page.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/auth/callback") {
    const code = searchParams.get("code");
    if (code) {
      const callback = request.nextUrl.clone();
      callback.pathname = "/auth/callback";
      callback.search = "";
      callback.searchParams.set("code", code);
      callback.searchParams.set("next", "/dashboard");
      return NextResponse.redirect(callback);
    }
    if (searchParams.has("error_description") && pathname !== "/login") {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.search = "?error=link";
      return NextResponse.redirect(login);
    }
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not put code between createServerClient and getClaims: it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  if (!signedIn && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
