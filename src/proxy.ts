import { NextResponse, type NextRequest } from "next/server";
import { bareHost, isAppHost, servedOnCustomHost, slugForHost } from "@/lib/custom-host";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // "getdibs.pro//pay/…" (links sent while the app URL had a trailing slash) renders,
  // then crashes in the browser: send it to the single-slash address.
  const raw = new URL(request.url);
  if (raw.pathname.startsWith("//")) {
    const fixed = request.nextUrl.clone();
    fixed.pathname = raw.pathname.replace(/^\/{2,}/, "/");
    return NextResponse.redirect(fixed, 308);
  }
  // A pro's own domain (the "Your own website" add-on): their page at "/", their pay
  // links as-is, and everything else on the app's own address. No sign-in there.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const host = bareHost(request.headers.get("host"));
  if (appUrl && host && !isAppHost(host, new URL(appUrl).host)) {
    const slug = await slugForHost(host);
    if (slug) {
      const { pathname, search } = request.nextUrl;
      if (pathname === "/") {
        const page = request.nextUrl.clone();
        page.pathname = `/${slug}`;
        return NextResponse.rewrite(page);
      }
      if (servedOnCustomHost(pathname)) return NextResponse.next();
      return NextResponse.redirect(new URL(`${pathname}${search}`, appUrl));
    }
  }
  return updateSession(request);
}

export const config = {
  // Skip static assets, images, and webhooks/cron (they authenticate themselves).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
