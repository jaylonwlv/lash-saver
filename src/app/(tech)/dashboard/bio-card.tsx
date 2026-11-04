import type { ReactNode } from "react";
import Link from "next/link";
import { CopyLink } from "@/components/ui/copy-link";

/** Instagram's own edit-profile page; on a phone with the app it opens there. */
const EDIT_PROFILE = "https://www.instagram.com/accounts/edit/";

/**
 * "Put your page in your bio": the pitch, the link, and the two taps to add it.
 * Ticks itself once the page gets a visit from Instagram (profiles.instagram_visit_at).
 */
export function BioCard({
  menuUrl,
  starterServices,
  savedServices,
  photos,
  inBio,
  domainOffer,
  hasInstagram = true,
}: {
  menuUrl: string;
  starterServices: number;
  savedServices: number;
  photos: number;
  inBio: boolean;
  /** "studionova.com" to offer the website add-on, or null (has one, or it's off). */
  domainOffer?: string | null;
  /** No handle: their page has no "Message to book" button yet, so say so first. */
  hasInstagram?: boolean;
}) {
  const address = menuUrl.replace(/^https?:\/\//, "");
  const pricesFirst = starterServices > 0 && savedServices === 0;
  return (
    <section id="bio" className="card flex scroll-mt-20 flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex size-11 shrink-0 items-center justify-center rounded-[14px] text-xl ${
            inBio ? "bg-success text-white" : "bg-brand-soft"
          }`}
        >
          {inBio ? "✓" : "🔗"}
        </span>
        <div className="flex flex-col">
          <h2 className="font-display text-xl leading-tight font-extrabold tracking-tight">
            {inBio ? "Your page is in your bio" : "Put your page in your bio"}
          </h2>
          <p className="text-muted text-sm">
            {inBio
              ? "People are opening it from Instagram"
              : "Your services, prices and policy, one link"}
          </p>
        </div>
      </div>

      {!inBio && (
        <ul className="flex flex-col gap-2 text-sm">
          <BioPerk>
            <strong>New clients find you easier.</strong> Anyone who taps your bio sees what you
            offer and what it costs, so they message you ready to book.
          </BioPerk>
          <BioPerk>
            <strong>Fewer &ldquo;how much?&rdquo; DMs.</strong> Prices and deposits are right there,
            so you skip the back-and-forth.
          </BioPerk>
          <BioPerk>
            <strong>Your rules, up front.</strong> Clients see your deposit and cancellation policy
            before they ever message, so the deposit is never a surprise.
          </BioPerk>
          <BioPerk>
            <strong>Easy to pass along.</strong> Regulars can send one link to a friend, and it
            shows your name and prices in the preview.
          </BioPerk>
        </ul>
      )}

      {!hasInstagram && (
        <p className="bg-brand-soft/60 rounded-2xl px-4 py-3 text-sm">
          Your page can&apos;t take messages yet.{" "}
          <a href="#instagram" className="text-brand font-semibold underline">
            Add your Instagram
          </a>{" "}
          so the &ldquo;Message to book&rdquo; button shows up.
        </p>
      )}
      {pricesFirst ? (
        <>
          <p className="bg-brand-soft/60 rounded-2xl px-4 py-3 text-sm">
            Your page shows only prices you&apos;ve saved, so it&apos;s empty until you confirm
            yours. It takes a minute.
          </p>
          <Link
            href="/dashboard/services/confirm"
            className="press bg-action text-action-foreground flex min-h-12 items-center justify-center rounded-2xl px-4 font-bold"
          >
            Confirm your prices
          </Link>
        </>
      ) : (
        <>
          {starterServices > 0 && (
            <p className="bg-brand-soft/60 rounded-2xl px-4 py-3 text-sm">
              {starterServices} example price{starterServices === 1 ? " is" : "s are"} still hidden
              from your page.{" "}
              <Link
                href="/dashboard/services/confirm"
                className="text-brand font-semibold underline"
              >
                Confirm your prices
              </Link>
            </p>
          )}
          <CopyLink url={menuUrl} display={address} label="Copy your page link" tinted />
          {!inBio && (
            <>
              <a
                href={EDIT_PROFILE}
                target="_blank"
                rel="noopener"
                className="press bg-ink text-pink flex min-h-12 items-center justify-center rounded-2xl px-4 font-bold"
              >
                Open Instagram
              </a>
              <ol className="text-muted flex flex-col gap-1 text-sm">
                <li>
                  <strong className="text-foreground">1.</strong> Copy your page link above.
                </li>
                <li>
                  <strong className="text-foreground">2.</strong> On Instagram: Edit profile → Links
                  → Add external link, and paste it.
                </li>
                <li>
                  <strong className="text-foreground">3.</strong> Tap the link once on your profile.
                  This step ticks itself off.
                </li>
              </ol>
            </>
          )}
        </>
      )}

      {domainOffer && (
        <Link
          href="/dashboard/domain"
          className="press bg-ink flex min-h-12 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-white"
        >
          <span className="flex flex-col">
            <span className="text-pink font-bold">Want {domainOffer}?</span>
            <span className="text-sm text-white/75">Your own website address, from $99/year</span>
          </span>
          <span aria-hidden className="text-pink text-xl">
            →
          </span>
        </Link>
      )}
      <Link
        href="/dashboard/gallery"
        className="press bg-brand-soft/60 flex min-h-12 items-center justify-between gap-3 rounded-2xl px-4 py-3"
      >
        <span className="flex flex-col">
          <span className="font-bold">
            {photos ? "Your work photos" : "Add photos of your work"}
          </span>
          <span className="text-muted text-sm">
            {photos ? `${photos} on your page` : "Optional: they glide across your page"}
          </span>
        </span>
        <span aria-hidden className="text-brand text-xl">
          →
        </span>
      </Link>
      <p className="text-muted text-sm">
        <strong className="text-foreground">This isn&apos;t a pay link.</strong> It doesn&apos;t
        book anyone or take a deposit. To lock in a client, tap{" "}
        <strong className="text-foreground">New appointment</strong> and send them the pay link it
        makes.
      </p>
      <Link
        href={menuUrl}
        target="_blank"
        className="text-brand inline-flex min-h-12 items-center justify-center text-sm font-semibold underline"
      >
        See what people see
      </Link>
    </section>
  );
}

function BioPerk({ children }: { children: ReactNode }) {
  return (
    <li className="text-muted flex gap-2">
      <span aria-hidden className="text-brand font-bold">
        ✓
      </span>
      <span className="[&_strong]:text-foreground">{children}</span>
    </li>
  );
}
