"use server";

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
  const { terms, website, ...req } = parsed.data;
  void terms; // Required by the schema; not stored beyond terms_accepted_at.
  void website;

  let url: string;
  try {
    url = await startDepositCheckout(req);
  } catch (err) {
    if (err instanceof CateringError) return { message: err.message, values };
    console.error("Catering checkout failed", err);
    return { message: "We couldn't start checkout. Try again in a minute.", values };
  }
  redirect(url);
}
