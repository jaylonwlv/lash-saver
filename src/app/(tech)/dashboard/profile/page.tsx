import type { Metadata } from "next";
import { Button, ButtonLink } from "@/components/ui/button";
import { publicEnv } from "@/lib/env.public";
import { TRADES } from "@/lib/trades";
import { registrarConfigured } from "@/lib/vercel/registrar";
import { createClient, getUser } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { PortraitPicker } from "./portrait-picker";
import { ProfileForm } from "./profile-form";
import { BackLink } from "@/components/ui/back-link";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "email, business_name, slug, instagram_handle, phone, timezone, cancellation_window_hours, policy_text, trade, accent_color, page_style, specialty, location, about, status_line, portrait_path",
    )
    .eq("id", user!.id)
    .single();
  if (error || !profile) throw new Error(`Loading profile failed: ${error?.message}`);

  const { count: starters } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("tech_id", user!.id)
    .eq("is_active", true)
    .eq("is_starter", true);
  const menuPrefix = `${new URL(publicEnv().NEXT_PUBLIC_APP_URL).host}/`;
  // First visit: what they told us they do, for them to keep or change. It only goes
  // public when they save; profiles.trade itself stays private.
  const tradeLabel = TRADES.find((t) => t.id === profile.trade)?.label ?? "";

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard" label="Dashboard" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted text-sm">Signed in as {profile.email}</p>
      </div>
      <ProfileForm
        menuPrefix={menuPrefix}
        examplePrices={(starters ?? 0) > 0}
        timeZones={Intl.supportedValuesOf("timeZone")}
        portrait={<PortraitPicker techId={user!.id} initial={profile.portrait_path} />}
        initial={{
          business_name: profile.business_name ?? "",
          slug: profile.slug ?? "",
          instagram_handle: profile.instagram_handle ?? "",
          phone: profile.phone ?? "",
          timezone: profile.timezone,
          cancellation_window_hours: String(profile.cancellation_window_hours),
          policy_text: profile.policy_text ?? "",
          trade: profile.trade ?? "",
          accent_color: profile.accent_color,
          page_style: profile.page_style,
          specialty: profile.specialty ?? tradeLabel,
          location: profile.location ?? "",
          about: profile.about ?? "",
          status_line: profile.status_line ?? "",
        }}
      />
      <div className="border-line flex flex-col gap-3 border-t pt-6">
        <ButtonLink href="/dashboard/gallery" variant="secondary">
          Your work photos
        </ButtonLink>
        {registrarConfigured() && (
          <ButtonLink href="/dashboard/domain" variant="secondary">
            Your own website
          </ButtonLink>
        )}
        <ButtonLink href="/dashboard/payments" variant="secondary">
          Deposits
        </ButtonLink>
        <ButtonLink href="/dashboard/billing" variant="secondary">
          Billing
        </ButtonLink>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </div>
  );
}
