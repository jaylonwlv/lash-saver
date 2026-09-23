import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { getUser } from "@/lib/supabase/server";
import { TechNav } from "./nav";

export default async function TechLayout({ children }: LayoutProps<"/">) {
  // The proxy already redirects signed-out users; this is the authoritative check.
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-line bg-surface/90 sticky top-0 z-10 border-b px-5 py-3 backdrop-blur">
        <Link href="/dashboard" className="font-semibold">
          {APP_NAME}
        </Link>
      </header>
      {/* Bottom padding clears the fixed tab bar. */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <TechNav />
    </div>
  );
}
