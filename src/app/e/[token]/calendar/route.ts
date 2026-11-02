import { type NextRequest, NextResponse } from "next/server";
import { bookingCalendar } from "@/lib/catering/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** The booked event as an .ics file ("Add to my calendar"). The token is the key. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/e/[token]/calendar">) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return new NextResponse("Not found", { status: 404 });
  const admin = createAdminClient();
  const { data: b } = await admin
    .from("catering_bookings")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (!b || !["confirmed", "balance_due", "paid_in_full", "completed"].includes(b.status))
    return new NextResponse("Not found", { status: 404 });
  const { data: owner } = await admin
    .from("profiles")
    .select("business_name")
    .eq("id", b.tech_id)
    .single();
  const ics = bookingCalendar(b, owner?.business_name ?? "Catering");
  if (!ics) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="event.ics"',
      "cache-control": "no-store",
    },
  });
}
