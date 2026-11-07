import type { Viewport } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { createClient, getUser } from "@/lib/supabase/server";
import { DEFAULT_ACCENT } from "@/lib/accents";
import {
  APP_COLOR_COOKIE,
  THEME_COOKIE,
  appColorStyle,
  parseAppColor,
  parseTheme,
  statusBarColor,
} from "@/lib/theme";
import { AppColorPicker } from "./app-color-picker";
import { InstallBanner } from "./install-banner";
import { TechNav } from "./nav";
import { ThemeToggle } from "./theme-toggle";
import { AssistantHelpButton } from "@/components/assistant/assistant";
import { assistantEnabled } from "@/components/assistant/enabled";

// The phone's status bar matches the header: the app color, or near-black in dark mode.
export async function generateViewport(): Promise<Viewport> {
  const jar = await cookies();
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  return { themeColor: statusBarColor(theme, jar.get(APP_COLOR_COOKIE)?.value) };
}

export default async function TechLayout({ children }: LayoutProps<"/">) {
  // The proxy already redirects signed-out users; this is the authoritative check.
  const user = await getUser();
  if (!user) redirect("/login");
  // Any pay link yet? The in-app-browser banner waits for the first one.
  const supabase = await createClient();
  const jar = await cookies();
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  const color = parseAppColor(jar.get(APP_COLOR_COOKIE)?.value);
  const { count: payLinks } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("tech_id", user.id);

  return (
    // Buttons in the pro's app are the bright color with black text (white fails contrast on it).
    // data-app scopes the app's dark palette; data-theme is the pro's light/dark choice;
    // data-accent is their color, absent for the stock hot pink.
    <div
      data-app
      data-theme={theme}
      data-accent={color === DEFAULT_ACCENT ? undefined : color}
      style={color === DEFAULT_ACCENT ? undefined : appColorStyle(color)}
      className="flex flex-1 flex-col [--action-foreground:var(--ink)] [--action:var(--pink)]"
    >
      <header className="bg-pink text-ink dark:bg-ink sticky top-0 z-10 px-5 dark:text-white">
        <div className="relative mx-auto flex min-h-14 max-w-2xl items-center justify-between gap-3">
          <Link
            href="/dashboard"
            aria-label={`${APP_NAME} home`}
            className="font-display flex min-h-12 items-center text-[28px] leading-none font-extrabold tracking-[-0.06em]"
          >
            {APP_NAME.toLowerCase()}
            <span className="dark:text-pink text-white">.</span>
          </Link>
          <div className="flex items-center gap-2">
            {assistantEnabled() && <AssistantHelpButton />}
            <AppColorPicker initial={color} />
            <ThemeToggle initial={theme} />
          </div>
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
