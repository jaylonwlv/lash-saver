import "server-only";
import { cache } from "react";
import { publicEnv } from "@/lib/env.public";
import { galleryPhotoUrl } from "@/lib/gallery";
import { isReservedSlug, SLUG_PATTERN } from "@/lib/slugs";
import { createClient } from "@/lib/supabase/server";

/**
 * A pro's public menu: name, Instagram, policy and services with real prices
 * (starter examples stay hidden). Null when there's no such page. Cached per
 * request, so the page, its metadata and its preview image share one lookup.
 */
export const loadMenu = cache(async (rawSlug: string) => {
  const slug = rawSlug.toLowerCase();
  // Not a slug a pro could have: skip the database entirely.
  if (!SLUG_PATTERN.test(slug) || isReservedSlug(slug)) return null;
  const supabase = await createClient();
  const { data: tech, error: techError } = await supabase
    .from("public_profiles")
    .select(
      "id, business_name, policy_text, instagram_handle, cancellation_window_hours, accent_color, page_style",
    )
    .eq("slug", slug)
    .maybeSingle();
  // A query error (bad key, missing table) must surface, not look like "no such pro".
  if (techError) throw new Error(`Menu page: loading pro failed: ${techError.message}`);
  if (!tech?.id) return null;

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, deposit_cents")
    .eq("tech_id", tech.id)
    .eq("is_active", true)
    // Starter services still have example prices; they appear once the pro sets theirs.
    .eq("is_starter", false)
    .order("price_cents");
  if (servicesError)
    throw new Error(`Menu page: loading services failed: ${servicesError.message}`);

  const { data: photos, error: photosError } = await supabase
    .from("gallery_photos")
    .select("id, path, width, height")
    .eq("tech_id", tech.id)
    .order("created_at");
  // The page still works without its gallery.
  if (photosError) console.error("Menu page: loading gallery failed", photosError);
  const supabaseUrl = publicEnv().NEXT_PUBLIC_SUPABASE_URL;

  return {
    slug,
    tech,
    services: services ?? [],
    name: tech.business_name ?? slug,
    photos: (photos ?? []).map((p) => ({ ...p, url: galleryPhotoUrl(supabaseUrl, p.path) })),
  };
});
