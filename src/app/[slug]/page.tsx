import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ProPage } from "@/components/pro-page/pro-page";
import { publicEnv } from "@/lib/env.public";
import { formatCents } from "@/lib/money";
import { inviteUrl } from "@/lib/referral";
import { SLUG_PATTERN } from "@/lib/slugs";
import { loadMenu } from "./menu";

/*
 * A pro's own page at getdibs.pro/<slug>, for their Instagram bio. The page
 * itself is components/pro-page (shared with the dashboard's live preview).
 */

const dollars = (cents: number) => formatCents(cents).replace(/\.00$/, "");

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const menu = await loadMenu((await params).slug);
  if (!menu) return { title: "Page not found" };
  const from = menu.services[0] ? ` From ${dollars(menu.services[0].price_cents)}.` : "";
  return {
    title: { absolute: `${menu.name} · Services & prices` },
    description: `See ${menu.name}'s services, prices and booking policy.${from} Message to book.`,
  };
}

export default async function MenuPage({ params }: PageProps<"/[slug]">) {
  const raw = (await params).slug;
  // getdibs.pro/Studio-Nova → getdibs.pro/studio-nova: one address per page (links, previews, search).
  const lower = raw.toLowerCase();
  if (raw !== lower && SLUG_PATTERN.test(lower)) permanentRedirect(`/${lower}`);
  const menu = await loadMenu(raw);
  if (!menu) notFound();
  const { tech, services, name, slug } = menu;
  return (
    <ProPage
      name={name}
      handle={tech.instagram_handle}
      services={services}
      cancellationHours={tech.cancellation_window_hours ?? 0}
      policyText={tech.policy_text}
      accent={tech.accent_color}
      style={tech.page_style}
      inviteHref={inviteUrl(publicEnv().NEXT_PUBLIC_APP_URL, slug, "menu")}
    />
  );
}
