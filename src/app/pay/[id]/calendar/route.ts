import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { clientCalendar, loadAppointmentContext } from "@/lib/appointments";

/**
 * The client's booked appointment as a calendar file. On an iPhone, Safari hands
 * it to Calendar, which offers to add it. Like the pay page, the unguessable
 * appointment id is what grants access.
 */
export async function GET(_request: NextRequest, { params }: RouteContext<"/pay/[id]/calendar">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });
  const ctx = await loadAppointmentContext(id);
  // Only once it's booked: a pay link still waiting on a deposit isn't a spot yet.
  if (!ctx || ctx.appointment.status !== "confirmed") {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(clientCalendar(ctx), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="appointment.ics"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
