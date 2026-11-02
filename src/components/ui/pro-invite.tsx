import { APP_NAME, TRIAL_DAYS } from "@/lib/config";

/**
 * "Are you a pro too?" on public pages, shown only after the client is done (paid,
 * or on a menu page), never before payment. Plain link: no trackers on these pages.
 */
export function ProInvite({ href, compact = false }: { href: string; compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-muted text-center text-sm">
        Take deposits like this for your own clients.{" "}
        <a href={href} className="text-brand font-medium underline">
          Try {APP_NAME} free
        </a>
      </p>
    );
  }
  return (
    <section className="border-line bg-surface flex flex-col gap-2 rounded-2xl border p-5 text-sm">
      <p className="font-semibold">Are you a pro too?</p>
      <p className="text-muted">
        Send deposit links like this one in your own DMs. Clients agree to your policy and pay
        before the spot is theirs.
      </p>
      <a
        href={href}
        className="text-brand inline-flex min-h-11 items-center self-start font-medium underline"
      >
        Try {APP_NAME} free for {TRIAL_DAYS} days
      </a>
    </section>
  );
}
