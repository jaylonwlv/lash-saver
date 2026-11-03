import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isReservedSlug, SLUG_PATTERN } from "@/lib/slugs";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ slug: z.string().regex(SLUG_PATTERN) });

/**
 * A pro's page was opened from Instagram (instagram-visit.tsx): record the first
 * time, which ticks "Put your page in your bio" and stops the bio reminder. Nothing
 * about the visitor is stored. Anyone can call it, and the worst it can do is tick
 * that step early.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || isReservedSlug(parsed.data.slug)) {
    return new NextResponse(null, { status: 400 });
  }
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ instagram_visit_at: new Date().toISOString() })
    .eq("slug", parsed.data.slug)
    .is("instagram_visit_at", null);
  if (error) console.error("Recording Instagram visit failed", error);
  return new NextResponse(null, { status: 204 });
}
