"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { createClient, getUser } from "@/lib/supabase/server";
import { profileSchema } from "./schema";

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const values = formValues(formData);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { errors: { slug: "That booking link is taken. Try another." }, values };
    }
    console.error("Saving profile failed", error);
    return { message: "Couldn't save your profile. Try again.", values };
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
