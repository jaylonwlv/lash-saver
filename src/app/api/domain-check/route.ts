import { NextResponse } from "next/server";
import { APP_NAME } from "@/lib/config";

/**
 * Dibs fetches https://<a pro's domain>/api/domain-check to confirm the new domain
 * really reaches this app (DNS, certificate and routing all working) before it tells
 * the pro their website is live. Nothing secret here.
 */
export function GET() {
  return NextResponse.json(
    { ok: true, app: APP_NAME },
    { headers: { "Cache-Control": "no-store" } },
  );
}
