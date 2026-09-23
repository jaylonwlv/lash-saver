import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Run by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${serverEnv().CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Release pay links nobody paid. The pay page also checks hold_expires_at
  // itself, so this only tidies statuses for the tech's list.
  const { data: expired, error } = await createAdminClient()
    .from("appointments")
    .update({ status: "expired" })
    .eq("status", "pending_deposit")
    .lt("hold_expires_at", new Date().toISOString())
    .select("id");
  if (error) throw new Error(`Expiring pay links failed: ${error.message}`);

  // TODO: reminders. For each confirmed appointment inside a REMINDER_OFFSETS_HOURS
  // window with no matching notification_log row, send "appointment_reminder".

  return NextResponse.json({ ok: true, expired: expired?.length ?? 0 });
}
