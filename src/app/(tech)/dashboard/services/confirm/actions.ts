"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formValues, type FormState } from "@/lib/forms";
import { createClient, getUser } from "@/lib/supabase/server";
import { parsePrices } from "./prices";

/** Saves every example price at once: their own prices go on the page, unticked ones are hidden. */
export async function confirmPrices(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const values = formValues(formData);
  const supabase = await createClient();
  // The ids come from the database, never the form.
  const { data: services, error } = await supabase
    .from("services")
    .select("id, is_starter")
    .eq("tech_id", user.id)
    .eq("is_active", true);
  if (error) {
    console.error("Loading services failed", error);
    return { message: "Couldn't save your prices. Try again.", values };
  }
  const ids = services.filter((s) => s.is_starter).map((s) => s.id);
  const parsed = parsePrices(
    ids,
    values,
    services.some((s) => !s.is_starter),
  );
  if ("errors" in parsed) {
    return { errors: parsed.errors, message: parsed.errors.form, values };
  }

  for (const row of parsed.rows) {
    const { error: saveError } = await supabase
      .from("services")
      .update(
        row.offer
          ? { price_cents: row.price_cents, deposit_cents: row.deposit_cents, is_starter: false }
          : { is_active: false },
      )
      .eq("id", row.id)
      .eq("tech_id", user.id);
    if (saveError) {
      console.error("Saving price failed", saveError);
      return { message: "Couldn't save every price. Check them and try again.", values };
    }
  }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard#bio");
}
