import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME, LEGAL_CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/config";

/** Shared layout for the Terms and Privacy pages: readable on a phone, plain HTML. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3">
        <Link href="/" className="inline-flex min-h-12 items-center font-semibold">
          {APP_NAME}
        </Link>
        <Link href="/login" className="text-brand inline-flex min-h-12 items-center font-medium">
          Sign in
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl px-5 pt-4 pb-[max(3rem,env(safe-area-inset-bottom))]">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted mt-2 text-sm">Last updated {LEGAL_UPDATED}</p>
        <div className="[&_a]:text-brand mt-6 flex flex-col gap-8 leading-relaxed [&_a]:underline [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
        <footer className="border-line text-muted mt-12 flex flex-wrap gap-x-4 border-t pt-6 text-sm">
          <Link href="/terms" className="inline-flex min-h-11 items-center underline">
            Terms of Service
          </Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center underline">
            Privacy Policy
          </Link>
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="inline-flex min-h-11 items-center underline"
          >
            Contact
          </a>
        </footer>
      </main>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
