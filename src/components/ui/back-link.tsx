import Link from "next/link";

/** "← Back" link at the top of inner pages. Full-height tap target for thumbs. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-brand -mt-3 -mb-4 -ml-2 inline-flex min-h-12 items-center gap-1 self-start rounded-xl px-2 font-medium active:opacity-70"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}
