import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MetaPixel } from "@/components/meta-pixel";
import { APP_NAME, TRIAL_DAYS } from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const viewport: Viewport = { themeColor: "#0d0b0c" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error, start } = await searchParams;
  // Older "Start free" links (?start=1) go to instant sign-up instead.
  if (start === "1") redirect("/start");

  return (
    <div data-theme="dark" className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-md px-5 pt-4">
        <Link href="/" className="inline-flex min-h-12 items-center gap-2 text-lg font-bold">
          <span className="bg-brand size-2.5 rounded-full" aria-hidden />
          {APP_NAME}
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 pt-4 pb-12">
        <h1 className="text-2xl font-bold">Sign in</h1>
        {error && (
          <p className="text-danger text-sm">
            That sign-in link didn&apos;t work or has expired. Send yourself a new code below.
          </p>
        )}
        <LoginForm next={typeof next === "string" ? next : undefined} />
        <p className="text-muted text-sm">
          New to {APP_NAME}?{" "}
          <Link href="/start" className="text-brand font-medium underline">
            Start free for {TRIAL_DAYS} days
          </Link>
        </p>
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
