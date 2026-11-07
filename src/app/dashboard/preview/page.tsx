import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProPage } from "@/components/pro-page/pro-page";
import { ACCENTS } from "@/lib/accents";
import { publicEnv } from "@/lib/env.public";
import { galleryPhotoUrl } from "@/lib/gallery";
import { PAGE_STYLES } from "@/lib/page-styles";
import { createClient, getUser } from "@/lib/supabase/server";

/*
 * The signed-in pro's own page, for the live preview in the dashboard (tour and
 * Profile load it in a phone-sized iframe). Outside the (tech) layout so it has
 * no app chrome. ?style= and ?accent= try a look before it's saved; example
 * (starter) prices show here, though the public page hides them until saved.
 */

export const metadata: Metadata = { title: "Preview", robots: { index: false } };

export default async function PagePreview({ searchParams }: PageProps<"/dashboard/preview">) {
  const user = await getUser();
  if (!user) notFound();
  const { style, accent } = await searchParams;
  const supabase = await createClient();
  const [{ data: profile }, { data: services }, { data: photos }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "business_name, instagram_handle, cancellation_window_hours, policy_text, accent_color, page_style, specialty, location, about, status_line, portrait_path",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents, deposit_cents")
      .eq("tech_id", user.id)
      .eq("is_active", true),
    supabase
      .from("gallery_photos")
      .select("id, path, width, height")
      .eq("tech_id", user.id)
      .order("created_at"),
  ]);
  if (!profile) notFound();
  const pick = (value: unknown, allowed: object, saved: string) =>
    typeof value === "string" && Object.hasOwn(allowed, value) ? value : saved;
  const supabaseUrl = publicEnv().NEXT_PUBLIC_SUPABASE_URL;

  return (
    <ProPage
      preview
      name={profile.business_name?.trim() || "Your business"}
      handle={profile.instagram_handle}
      services={services ?? []}
      cancellationHours={profile.cancellation_window_hours ?? 0}
      policyText={profile.policy_text}
      accent={pick(accent, ACCENTS, profile.accent_color)}
      style={pick(style, PAGE_STYLES, profile.page_style)}
      inviteHref={null}
      photos={(photos ?? []).map((p) => ({ ...p, url: galleryPhotoUrl(supabaseUrl, p.path) }))}
      specialty={profile.specialty}
      location={profile.location}
      about={profile.about}
      status={profile.status_line}
      portraitUrl={
        profile.portrait_path ? galleryPhotoUrl(supabaseUrl, profile.portrait_path) : null
      }
    />
  );
}
