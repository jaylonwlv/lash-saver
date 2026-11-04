import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { ButtonLink } from "@/components/ui/button";
import {
  DOMAIN_MONTHLY_CENTS,
  DOMAIN_SETUP_CENTS,
  DOMAIN_YEARLY_CENTS,
  domainLabel,
  yearlySavingsCents,
} from "@/lib/domains";
import { formatCents } from "@/lib/money";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { registrarConfigured } from "@/lib/vercel/registrar";
import { DomainFlow, TransferCode } from "./domain-flow";
import { DomainProgressView } from "./progress";

export const metadata: Metadata = { title: "Your own website" };

const price = (cents: number) => formatCents(cents).replace(/\.00$/, "");

export default async function DomainPage({ searchParams }: PageProps<"/dashboard/domain">) {
  const { checkout, check } = await searchParams;
  const user = await getUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: row }] = await Promise.all([
    supabase
      .from("profiles")
      .select("business_name, email, slug, subscription_status, timezone")
      .eq("id", user!.id)
      .single(),
    supabase.from("custom_domains").select("*").eq("tech_id", user!.id).maybeSingle(),
  ]);
  const canBuy = ["trialing", "active"].includes(profile?.subscription_status ?? "");
  const tz = profile?.timezone ?? "America/New_York";

  return (
    <div className="flex flex-col gap-5">
      <BackLink href="/dashboard" label="Dashboard" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Your own website</h1>
        <p className="text-muted">
          Your page at your own address, like{" "}
          <strong className="text-foreground">
            {domainLabel(profile?.business_name ?? "") ?? "yourbusiness"}.com
          </strong>
          . Looks pro in your bio, on your cards, everywhere.
        </p>
      </div>

      {!registrarConfigured() ? (
        <p className="card text-muted p-5">Coming soon.</p>
      ) : row?.status === "active" && row.verified_at ? (
        <section className="card flex flex-col gap-3 p-5">
          <p className="text-success text-sm font-bold">✓ Live</p>
          <a
            href={`https://${row.domain}`}
            target="_blank"
            rel="noopener"
            className="font-display text-brand text-2xl font-extrabold break-all underline"
          >
            {row.domain}
          </a>
          <p className="text-muted text-sm">
            {row.cancel_at_period_end && row.current_period_end
              ? `Your plan ends ${formatDate(row.current_period_end, tz)}. After that your page goes back to your ${profile?.slug ? `getdibs.pro/${profile.slug}` : "Dibs"} link, and the domain stays registered to you until it expires.`
              : `Registered in your name. Renews with your ${row.plan} plan${row.expires_at ? `; the domain is paid through ${formatDate(row.expires_at, tz)}` : ""}.`}
          </p>
          <p className="text-muted text-xs">
            Not opening on your phone yet? Phones remember a brand-new address as missing for a
            little while: turn Wi-Fi off, or try again in a few minutes.
          </p>
          <ButtonLink href="/dashboard/billing" variant="secondary">
            Manage billing
          </ButtonLink>
          <TransferCode />
        </section>
      ) : row &&
        (row.status === "registering" ||
          row.status === "active" ||
          (checkout === "done" && row.status === "pending")) ? (
        <DomainProgressView
          initial={{
            domain: row.domain,
            status: row.status,
            // Back from checkout before Stripe's confirmation lands: payment is in flight.
            paid: row.status !== "pending" || checkout === "done",
            registered: Boolean(row.registered_at),
            connected: row.status === "active",
            live: Boolean(row.verified_at),
          }}
          pageUrl={profile?.slug ? `getdibs.pro/${profile.slug}` : null}
        />
      ) : !canBuy ? (
        <section className="card flex flex-col gap-3 p-5">
          <p className="text-muted">
            Your own website is for pros on a plan or free trial. Start yours, then come back here.
          </p>
          <ButtonLink href="/dashboard/billing">See your plan</ButtonLink>
        </section>
      ) : (
        <>
          {row?.status === "failed" && (
            <p className="bg-brand-soft/60 rounded-2xl px-4 py-3 text-sm">
              We couldn&apos;t register {row.domain}, so we refunded you in full. Pick another name
              below.
            </p>
          )}
          <DomainFlow
            suggestion={profile?.business_name ?? ""}
            autoSearch={check === "1"}
            email={profile?.email ?? ""}
            prices={{
              yearly: price(DOMAIN_YEARLY_CENTS),
              monthly: price(DOMAIN_MONTHLY_CENTS),
              setup: price(DOMAIN_SETUP_CENTS),
              savings: price(yearlySavingsCents()),
            }}
          />
        </>
      )}
    </div>
  );
}
