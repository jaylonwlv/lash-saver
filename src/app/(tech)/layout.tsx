import type { Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { createClient, getUser } from "@/lib/supabase/server";
import { InstallBanner } from "./install-banner";
import { TechNav } from "./nav";

// The phone's status bar matches the pink header.
export const viewport: Viewport = { themeColor: "#ff5c9d" };

export default async function TechLayout({ children }: LayoutProps<"/">) {
  // The proxy already redirects signed-out users; this is the authoritative check.
  const user = await getUser();
  if (!user) redirect("/login");
  // Any pay link yet? The in-app-browser banner waits for the first one.
  const supabase = await createClient();
  const { count: payLinks } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("tech_id", user.id);

  return (
    // Buttons in the pro's app are hot pink with black text (white fails contrast on it).
    <div className="flex flex-1 flex-col [--action-foreground:var(--ink)] [--action:var(--pink)]">
      <header className="bg-pink text-ink sticky top-0 z-10 px-5">
        <Link
          href="/dashboard"
          aria-label={`${APP_NAME} home`}
          className="font-display mx-auto flex min-h-14 max-w-2xl items-center text-[28px] leading-none font-extrabold tracking-[-0.06em]"
        >
          {APP_NAME.toLowerCase()}
          <span className="text-white">.</span>
        </Link>
      </header>
      {/* Bottom padding clears the fixed tab bar. Page titles use the display face. */}
      <main className="[&_h1]:font-display mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] [&_h1]:tracking-tight">
        <InstallBanner placement="layout" payLinkSent={(payLinks ?? 0) > 0} />
        {children}
      </main>
      <TechNav />
    </div>
  );
}
