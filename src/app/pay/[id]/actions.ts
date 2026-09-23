"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { stripeErrorMessage } from "@/lib/stripe/connect";
import { PayError, createDepositCheckout } from "@/lib/stripe/deposits";

const PAY_ERROR_MESSAGE: Record<PayError["reason"], string> = {
  closed: "This appointment can't be paid anymore. Refresh the page to see its status.",
  expired: "This pay link has expired. Message your lash tech for a new one.",
  tech_not_ready: "Your lash tech can't take payments yet. Please let them know.",
};

/** Client agreed to the policy: send them to Stripe Checkout for the deposit. */
export async function payDeposit(
  appointmentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(appointmentId).success) {
    return { message: PAY_ERROR_MESSAGE.closed };
  }
  if (formData.get("agree") !== "on") {
    return { errors: { agree: "Please agree to the deposit policy to continue." } };
  }

  let url: string;
  try {
    url = await createDepositCheckout(appointmentId);
  } catch (err) {
    if (err instanceof PayError) return { message: PAY_ERROR_MESSAGE[err.reason] };
    console.error("Creating checkout failed", err);
    return { message: stripeErrorMessage(err) };
  }
  redirect(url);
}
