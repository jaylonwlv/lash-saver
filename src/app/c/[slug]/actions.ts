"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CateringError, startDepositCheckout } from "@/lib/catering/server";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { bookingRequestSchema } from "./schema";

/** Pay the deposit: validates, recalculates, holds the date and sends them to Stripe. */
export async function requestBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = bookingRequestSchema.safeParse(values);
  if (!parsed.success) {
    if (values.website) return { message: "Something went wrong. Try again.", values };
    return { errors: fieldErrors(parsed.error), values, message: "Check the highlighted fields." };
  }
  const { esign, website, ...req } = parsed.data;
  void esign; // Required by the schema; the signed time is stored with the agreement.
  void website;
  const h = await headers();
  const signer = {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 100) || null,
    userAgent: h.get("user-agent")?.slice(0, 500) || null,
  };

  let url: string;
  try {
    url = await startDepositCheckout(req, signer);
  } catch (err) {
    if (err instanceof CateringError) return { message: err.message, values };
    console.error("Catering checkout failed", err);
    return { message: "We couldn't start checkout. Try again in a minute.", values };
  }
  redirect(url);
}
