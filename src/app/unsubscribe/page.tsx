import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";
import { readUnsubscribeToken } from "@/lib/unsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";
import { setMarketing } from "./actions";

export const metadata: Metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};

/** Unsubscribe from tips and offers. Account and booking emails keep coming. */
export default async function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  const { t, done } = await searchParams;
  const token = typeof t === "string" ? t : "";
  const techId = readUnsubscribeToken(token);
  const { data: profile } = techId
    ? await createAdminClient()
        .from("profiles")
        .select("marketing_opt_out_at")
        .eq("id", techId)
        .maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-5 py-16">
      {!profile ? (
        <>
          <h1 className="text-2xl font-bold">This link doesn&apos;t work</h1>
          <p className="text-muted">Use the link at the bottom of one of our emails.</p>
        </>
      ) : profile.marketing_opt_out_at ? (
        <>
          <h1 className="text-2xl font-bold">
            {done === "out" ? "You're unsubscribed" : "You're not getting tips"}
          </h1>
          <p className="text-muted">
            We won&apos;t send you tips or offers. You&apos;ll still get emails about your account
            and your clients&apos; bookings and payments.
          </p>
          <form action={setMarketing.bind(null, token, false)}>
            <Button type="submit" variant="secondary">
              Get tips again
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">
            {done === "in" ? "You're back on the list" : `Stop tips from ${APP_NAME}?`}
          </h1>
          <p className="text-muted">
            This stops tips and offers. You&apos;ll still get emails about your account and your
            clients&apos; bookings and payments.
          </p>
          <form action={setMarketing.bind(null, token, true)}>
            <Button type="submit">Unsubscribe</Button>
          </form>
        </>
      )}
    </main>
  );
}
