import Link from "next/link";
import { DOMAIN_MONTHLY_CENTS, DOMAIN_SETUP_CENTS, DOMAIN_YEARLY_CENTS } from "@/lib/domains";
import { formatCents } from "@/lib/money";

const dollars = (cents: number) => formatCents(cents).replace(/\.00$/, "");

/**
 * The "Your own website" add-on, as its own card so it doesn't read as one more row of
 * setup: their page's address today, crossed out, and the .com it could be.
 */
export function WebsiteCard({
  domain,
  currentAddress,
}: {
  domain: string;
  currentAddress: string;
}) {
  return (
    <section
      aria-labelledby="website-card-title"
      className="bg-ink dark:ring-pink/50 relative flex flex-col gap-4 overflow-hidden rounded-[24px] p-5 text-white shadow-[0_18px_40px_-18px_var(--pink)] dark:ring-2"
    >
      <span
        aria-hidden
        className="bg-pink/30 pointer-events-none absolute -top-16 -right-16 size-48 rounded-full blur-3xl"
      />
      <p className="text-pink relative text-xs font-bold tracking-[0.14em] uppercase">
        Upgrade your page
      </p>
      <h2
        id="website-card-title"
        className="font-display relative text-2xl leading-tight font-extrabold tracking-tight"
      >
        Get your own .com
      </h2>

      {/* The address bar, before and after. */}
      <div className="relative flex flex-col gap-2" aria-hidden>
        <span className="flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm text-white/50">
          <span>🔒</span>
          <span className="truncate line-through decoration-white/50">{currentAddress}</span>
        </span>
        <span className="flex min-h-12 items-center gap-2 rounded-full bg-white px-4 text-base font-bold text-black ring-2 ring-[var(--pink)]">
          <span>🔒</span>
          <span className="truncate">{domain}</span>
        </span>
      </div>

      <p className="relative text-sm text-white/80">
        The same page at your own address: easier to remember, and it looks like a real business on
        your cards, flyers and bio. Registered in your name.
      </p>
      <p className="relative text-sm">
        <strong className="text-lg">{dollars(DOMAIN_YEARLY_CENTS)}/year</strong>
        <span className="text-white/60">
          {" "}
          · or {dollars(DOMAIN_MONTHLY_CENTS)}/month + {dollars(DOMAIN_SETUP_CENTS)} setup
        </span>
      </p>
      <Link
        href="/dashboard/domain?check=1"
        className="press bg-pink text-ink relative flex min-h-12 items-center justify-center rounded-2xl px-5 text-center font-extrabold"
      >
        See if it&apos;s free →
      </Link>
    </section>
  );
}
