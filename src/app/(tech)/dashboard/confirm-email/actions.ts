"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";

const emailSchema = z
  .email("Enter a valid email address.")
  .transform((e) => e.trim().toLowerCase());

/**
 * Fix a mistyped email from instant sign-up. Only before it's confirmed: after
 * that, the email is how the pro signs in, so it can't be changed from here.
 */
export async function changeUnconfirmedEmail(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = emailSchema.safeParse(values.email);
  if (!parsed.success) return { errors: { email: "Enter a valid email address." }, values };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email_confirmed")
    .eq("id", user.id)
    .single();
  if (!profile || profile.email_confirmed) return { message: "Your email is already confirmed." };

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: parsed.data,
    email_confirm: true,
  });
  if (error) {
    if (error.code === "email_exists" || error.status === 422) {
      return {
        errors: { email: "That email already has an account. Sign in with it instead." },
        values,
      };
    }
    console.error("Changing unconfirmed email failed", error);
    return { message: "We couldn't change it. Try again.", values };
  }
  await admin.from("profiles").update({ email: parsed.data }).eq("id", user.id);

  revalidatePath("/dashboard", "layout");
  return {};
}
