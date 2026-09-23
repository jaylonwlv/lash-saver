import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env.public";
import { createClient, getUser } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { ProfileForm } from "./profile-form";
import { BackLink } from "@/components/ui/back-link";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "email, business_name, slug, instagram_handle, phone, timezone, cancellation_window_hours, policy_text",
    )
    .eq("id", user!.id)
    .single();
  if (error || !profile) throw new Error(`Loading profile failed: ${error?.message}`);

  const bookingPrefix = `${new URL(publicEnv().NEXT_PUBLIC_APP_URL).host}/b/`;

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard" label="Dashboard" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted text-sm">Signed in as {profile.email}</p>
      </div>
      <ProfileForm
        bookingPrefix={bookingPrefix}
        timeZones={Intl.supportedValuesOf("timeZone")}
        initial={{
          business_name: profile.business_name ?? "",
          slug: profile.slug ?? "",
          instagram_handle: profile.instagram_handle ?? "",
          phone: profile.phone ?? "",
          timezone: profile.timezone,
          cancellation_window_hours: String(profile.cancellation_window_hours),
          policy_text: profile.policy_text ?? "",
        }}
      />
      <form action={signOut} className="border-line border-t pt-6">
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </div>
  );
}
