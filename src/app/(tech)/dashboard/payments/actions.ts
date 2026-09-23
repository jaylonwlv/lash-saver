"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { createClient, getUser } from "@/lib/supabase/server";
import { startStripeOnboarding } from "../stripe/actions";
import { manualPaymentsSchema } from "./schema";

/** Pro collects deposits with their own Cash App, Zelle or Venmo. */
export async function saveManualPayments(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const values = formValues(formData);
  const parsed = manualPaymentsSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, deposit_method: "manual" })
    .eq("id", user.id);
  if (error) {
    console.error("Saving payment handles failed", error);
    return { message: "Couldn't save. Try again.", values };
  }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard?deposits=manual");
}

/** Switch to automatic Stripe payments, connecting Stripe first if needed. */
export async function useStripeDeposits(): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ deposit_method: "stripe" })
    .eq("id", user.id)
    .select("stripe_charges_enabled")
    .single();
  if (error || !profile) return { message: "Couldn't switch. Try again." };

  revalidatePath("/dashboard", "layout");
  if (!profile.stripe_charges_enabled) return startStripeOnboarding();
  redirect("/dashboard?deposits=stripe");
}
