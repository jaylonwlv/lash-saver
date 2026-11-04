import { NextResponse } from "next/server";
import { APP_NAME } from "@/lib/config";
import { bareHost, isAppHost, slugForHost } from "@/lib/custom-host";

/**
 * Dibs fetches https://<a pro's domain>/api/domain-check to confirm the new domain
 * really reaches this app (DNS, certificate and routing all working) before it tells
 * the pro their website is live. ok is true only when the request arrived on a live
 * custom domain that resolves to a pro's page: if the lookup fails, "/" there shows
 * the Dibs homepage, so that must not count as live. Nothing secret here.
 */
export async function GET(request: Request) {
  const host = bareHost(request.headers.get("host"));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const custom = Boolean(host && appUrl && !isAppHost(host, new URL(appUrl).host));
  const ok = custom && host ? Boolean(await slugForHost(host)) : false;
  return NextResponse.json({ ok, app: APP_NAME }, { headers: { "Cache-Control": "no-store" } });
}
