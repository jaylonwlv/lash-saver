import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { MetaPixel } from "@/components/meta-pixel";
import { APP_NAME, TRIAL_DAYS } from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const viewport: Viewport = { themeColor: "#0d0b0c" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error, start } = await searchParams;
  // "Start free" buttons land here with ?start=1: same form, worded for new pros.
  const signUp = start === "1";

  return (
    <div data-theme="dark" className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-md px-5 pt-4">
        <Link href="/" className="inline-flex min-h-12 items-center gap-2 text-lg font-bold">
          <span className="bg-brand size-2.5 rounded-full" aria-hidden />
          {APP_NAME}
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 pt-4 pb-12">
        {signUp ? (
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Start your free {TRIAL_DAYS} days</h1>
            <p className="text-muted">
              Enter your email and we&apos;ll send you a code. No card to sign up: you add one
              before your first pay link.
            </p>
          </div>
        ) : (
          <h1 className="text-2xl font-bold">Sign in</h1>
        )}
        {error && (
          <p className="text-danger text-sm">
            That sign-in link didn&apos;t work or has expired. Send yourself a new code below.
          </p>
        )}
        <LoginForm next={typeof next === "string" ? next : undefined} signUp={signUp} />
        {signUp && (
          <p className="text-muted text-sm">
            Already use {APP_NAME}? Same form: enter your email to sign in.
          </p>
        )}
        <MetaPixel pixelId={publicEnv().NEXT_PUBLIC_META_PIXEL_ID} />
        <p className="text-muted text-xs">
          By continuing, you agree to the{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
