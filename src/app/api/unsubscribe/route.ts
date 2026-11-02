import { type NextRequest, NextResponse } from "next/server";
import { readUnsubscribeToken } from "@/lib/unsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * One-click unsubscribe (RFC 8058): mail apps POST here from the List-Unsubscribe
 * header. Opens nothing and asks nothing. A GET (someone opening the URL) goes to the
 * page, which asks first, so link scanners can't unsubscribe anyone.
 */
export async function POST(request: NextRequest) {
  const techId = readUnsubscribeToken(request.nextUrl.searchParams.get("t"));
  if (!techId) return new NextResponse("Invalid link", { status: 400 });
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ marketing_opt_out_at: new Date().toISOString() })
    .eq("id", techId)
    .is("marketing_opt_out_at", null);
  if (error) return new NextResponse("Try again later", { status: 500 });
  return new NextResponse("Unsubscribed", { status: 200 });
}

export function GET(request: NextRequest) {
  const url = new URL("/unsubscribe", request.url);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url);
}
