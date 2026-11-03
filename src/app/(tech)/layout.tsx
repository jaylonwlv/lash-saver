import type { Viewport } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { createClient, getUser } from "@/lib/supabase/server";
import { THEME_COLOR, THEME_COOKIE, parseTheme } from "@/lib/theme";
import { InstallBanner } from "./install-banner";
import { TechNav } from "./nav";
import { ThemeToggle } from "./theme-toggle";

// The phone's status bar matches the header: pink, or near-black in dark mode.
export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return { themeColor: THEME_COLOR[theme] };
}

export default async function TechLayout({ children }: LayoutProps<"/">) {
  // The proxy already redirects signed-out users; this is the authoritative check.
  const user = await getUser();
  if (!user) redirect("/login");
  // Any pay link yet? The in-app-browser banner waits for the first one.
  const supabase = await createClient();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const { count: payLinks } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("tech_id", user.id);

  return (
    // Buttons in the pro's app are hot pink with black text (white fails contrast on it).
    // data-app scopes the app's dark palette; data-theme is the pro's light/dark choice.
    <div
      data-app
      data-theme={theme}
      className="flex flex-1 flex-col [--action-foreground:var(--ink)] [--action:var(--pink)]"
    >
      <header className="bg-pink text-ink dark:bg-ink sticky top-0 z-10 px-5 dark:text-white">
        <div className="mx-auto flex min-h-14 max-w-2xl items-center justify-between gap-3">
          <Link
            href="/dashboard"
            aria-label={`${APP_NAME} home`}
            className="font-display flex min-h-12 items-center text-[28px] leading-none font-extrabold tracking-[-0.06em]"
          >
            {APP_NAME.toLowerCase()}
            <span className="dark:text-pink text-white">.</span>
          </Link>
          <ThemeToggle initial={theme} />
        </div>
      </header>
      {/* Bottom padding clears the fixed tab bar and its raised New button. Page titles use the display face. */}
      <main className="[&_h1]:font-display mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] [&_h1]:tracking-tight">
        <InstallBanner placement="layout" payLinkSent={(payLinks ?? 0) > 0} />
        {children}
      </main>
      <TechNav />
    </div>
  );
}
