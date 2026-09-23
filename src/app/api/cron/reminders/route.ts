import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";

/**
 * Run by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${serverEnv().CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: for each confirmed appointment inside a REMINDER_OFFSETS_HOURS window
  // with no matching notification_log row, notify({ template: "appointment_reminder" }).
  // Also expire pending_deposit appointments past hold_expires_at.

  return NextResponse.json({ ok: true });
}
