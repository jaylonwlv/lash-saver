import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { PROCESSING_FEE_LABEL } from "@/lib/config";
import { canTakeDeposits, manualHandles } from "@/lib/payments";
import { createClient, getUser } from "@/lib/supabase/server";
import { openStripeDashboard } from "../stripe/actions";
import { StripeButton } from "../stripe/stripe-button";
import { useStripeDeposits } from "./actions";
import { ManualPaymentsForm } from "./manual-form";

export const metadata: Metadata = { title: "Deposits" };

export default async function PaymentsPage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: p, error } = await supabase
    .from("profiles")
    .select(
      "deposit_method, stripe_account_id, stripe_charges_enabled, cashapp_tag, zelle_contact, venmo_handle",
    )
    .eq("id", user!.id)
    .single();
  if (error || !p) throw new Error(`Loading payment settings failed: ${error?.message}`);

  const manual = p.deposit_method === "manual";
  const ready = canTakeDeposits(p);
  const current = manual
    ? `Clients pay you with ${manualHandles(p)
        .map((h) => h.label)
        .join(", ")}, and you confirm each deposit.`
    : p.stripe_charges_enabled
      ? "Clients pay by card, Apple Pay or Google Pay. Confirmations and refunds are automatic."
      : "Not set up yet.";

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard" label="Dashboard" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Deposits</h1>
        <p className={ready ? "text-muted" : "text-danger"}>{current}</p>
      </div>

      <section
        className={`bg-surface flex flex-col gap-4 rounded-2xl border p-5 ${
          manual ? "border-brand border-2" : "border-line"
        }`}
      >
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold">Collect it yourself {manual && "(in use)"}</h2>
          <p className="text-muted text-sm">
            Keep using Cash App, Zelle or Venmo. Set up in 2 minutes, no ID check. You confirm each
            deposit and send any refunds yourself.
          </p>
        </div>
        <ManualPaymentsForm
          active={manual}
          initial={{
            cashapp_tag: p.cashapp_tag ?? "",
            zelle_contact: p.zelle_contact ?? "",
            venmo_handle: p.venmo_handle ?? "",
          }}
        />
      </section>

      <section
        className={`bg-surface flex flex-col gap-3 rounded-2xl border p-5 ${
          !manual && p.stripe_charges_enabled ? "border-brand border-2" : "border-line"
        }`}
      >
        <h2 className="font-semibold">
          Automatic with Stripe {!manual && p.stripe_charges_enabled && "(in use)"}
        </h2>
        <p className="text-muted text-sm">
          Clients pay by card, Apple Pay or Google Pay. Bookings confirm and refunds happen
          automatically, and deposits go to your bank. {PROCESSING_FEE_LABEL} per deposit. Stripe
          verifies your identity once (about 5 minutes).
        </p>
        {!manual && p.stripe_charges_enabled ? (
          <StripeButton action={openStripeDashboard} label="View payouts" variant="secondary" />
        ) : (
          <StripeButton
            action={useStripeDeposits}
            variant="secondary"
            label={
              p.stripe_charges_enabled
                ? "Switch to automatic"
                : p.stripe_account_id
                  ? "Continue Stripe setup"
                  : "Connect Stripe"
            }
          />
        )}
      </section>
    </div>
  );
}
