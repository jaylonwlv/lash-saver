import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { sent, next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 py-12">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {sent ? (
        <p className="text-muted">Check your email for a sign-in link. You can close this tab.</p>
      ) : (
        <LoginForm next={typeof next === "string" ? next : undefined} />
      )}
    </main>
  );
}
