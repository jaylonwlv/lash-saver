import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDuration } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

/** Public booking page. Techs paste this link into Instagram DMs. */
export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Book with ${slug}` };
}

export default async function BookingPage({ params }: PageProps<"/b/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tech, error: techError } = await supabase
    .from("public_profiles")
    .select("id, business_name, policy_text")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  // A query error (bad key, missing table) must surface, not look like "no such tech".
  if (techError) throw new Error(`Booking page: loading tech failed: ${techError.message}`);
  if (!tech?.id) notFound();

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, deposit_cents")
    .eq("tech_id", tech.id)
    .eq("is_active", true)
    .order("price_cents");
  if (servicesError) {
    throw new Error(`Booking page: loading services failed: ${servicesError.message}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <h1 className="text-2xl font-bold">{tech.business_name ?? slug}</h1>
      {/* TODO: time picker, client details form, then Stripe Checkout for the deposit. */}
      <ul className="flex flex-col gap-3">
        {services?.map((s) => (
          <li key={s.id} className="border-line bg-surface rounded-2xl border p-4">
            <p className="font-medium">{s.name}</p>
            <p className="text-muted text-sm">
              {formatDuration(s.duration_minutes)} · {formatCents(s.price_cents)} ·{" "}
              {formatCents(s.deposit_cents)} deposit
            </p>
          </li>
        ))}
      </ul>
      {tech.policy_text && <p className="text-muted text-sm">{tech.policy_text}</p>}
    </main>
  );
}
