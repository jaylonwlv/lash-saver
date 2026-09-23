import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { getUser } from "@/lib/supabase/server";

export default async function TechLayout({ children }: LayoutProps<"/">) {
  // The proxy already redirects signed-out users; this is the authoritative check.
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-line bg-surface/90 sticky top-0 z-10 border-b px-5 py-3 backdrop-blur">
        <span className="font-semibold">{APP_NAME}</span>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
