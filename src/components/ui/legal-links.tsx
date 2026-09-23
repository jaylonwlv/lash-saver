import Link from "next/link";
import { APP_NAME } from "@/lib/config";

/** Small footer for public pages: who runs the page, plus Terms and Privacy. */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-muted flex flex-wrap items-center justify-center gap-x-3 text-xs ${className}`}
    >
      <span>Powered by {APP_NAME}</span>
      <span aria-hidden>·</span>
      <Link href="/terms" className="inline-flex min-h-11 items-center underline">
        Terms
      </Link>
      <span aria-hidden>·</span>
      <Link href="/privacy" className="inline-flex min-h-11 items-center underline">
        Privacy
      </Link>
    </p>
  );
}
