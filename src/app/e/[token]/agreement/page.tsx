import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { signedAgreement } from "@/lib/catering/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Signed agreement",
  robots: { index: false, follow: false },
};

/** The agreement exactly as the host signed it. The token in the URL is the key. */
export default async function AgreementPage({ params }: PageProps<"/e/[token]/agreement">) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) notFound();
  const { data: b } = await createAdminClient()
    .from("catering_bookings")
    .select("contract_text, signature_name, signed_at, signer_ip")
    .eq("public_token", token)
    .maybeSingle();
  const text = b ? signedAgreement(b) : undefined;
  if (!text) notFound();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-5 py-8">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <a href={`/e/${token}`} className="text-brand text-sm font-medium">
          ← Back to the booking
        </a>
        <PrintButton />
      </div>
      <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{text}</pre>
    </main>
  );
}
