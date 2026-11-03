import "server-only";
import { SUBSCRIPTION_PRICE_CENTS } from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { formatCents } from "@/lib/money";
import { alreadyLogged, notifyOnce } from "@/lib/notifications/log";
import { manualHandles } from "@/lib/payments";
import { menuPageUrl } from "@/lib/slugs";
import { freeUntil } from "@/lib/stripe/billing";
import { createAdminClient } from "@/lib/supabase/admin";

/** Only accounts this new get the welcome (the sign-in code itself can take a while to use). */
const NEW_ACCOUNT_HOURS = 3;

/**
 * The founder welcome for pros who didn't come through /start: their first
 * sign-in with an email code, a link, Apple or Google creates the account, so
 * that's when they get it. /start sends its own (with a one-tap sign-in link);
 * both are logged as founder_welcome:<tech id>, so nobody gets two. Older
 * accounts signing in never get it. Failures are logged, never thrown.
 */
export async function welcomeNewPro(user: {
  id: string;
  email?: string | null;
  created_at: string;
}): Promise<void> {
  try {
    if (!user.email) return;
    if (Date.now() - new Date(user.created_at).getTime() > NEW_ACCOUNT_HOURS * 3_600_000) return;
    const key = `founder_welcome:${user.id}`;
    if (await alreadyLogged(key)) return;

    const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
    const { data: profile } = await createAdminClient()
      .from("profiles")
      .select(
        "slug, deposit_method, stripe_charges_enabled, cashapp_tag, zelle_contact, venmo_handle",
      )
      .eq("id", user.id)
      .maybeSingle();
    const hasHandle = profile ? manualHandles(profile).length > 0 : false;

    await notifyOnce(key, {
      to: { email: user.email },
      template: "founder_welcome",
      data: {
        appUrl,
        needsHandle: profile?.deposit_method !== "stripe" && !hasHandle,
        // Live as soon as they have an address (it never takes money).
        pageUrl: profile?.slug ? menuPageUrl(appUrl, profile.slug) : undefined,
        nextLink: await freeUntil(user.id).then(
          (until) => ({
            freeUntil: until,
            price: formatCents(SUBSCRIPTION_PRICE_CENTS).replace(/\.00$/, ""),
          }),
          () => undefined,
        ),
      },
    });
  } catch (err) {
    console.error("Founder welcome on first sign-in failed", err);
  }
}
