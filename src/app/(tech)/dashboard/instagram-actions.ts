"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { instagramHandle, type FormState } from "@/lib/forms";
import { createClient, getUser } from "@/lib/supabase/server";

const schema = z.object({
  instagram_handle: instagramHandle.refine((v) => v !== null, "Type your Instagram handle."),
});

/** The dashboard's "Add your Instagram" card: saves the handle behind "Message to book". */
export async function saveInstagram(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const values = { instagram_handle: String(formData.get("instagram_handle") ?? "") };
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return {
      errors: { instagram_handle: parsed.error.issues[0]?.message ?? "Check your handle." },
      values,
    };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ instagram_handle: parsed.data.instagram_handle })
    .eq("id", user.id);
  if (error) {
    console.error("Saving Instagram handle failed", error);
    return { message: "Couldn't save that. Try again.", values };
  }
  revalidatePath("/dashboard");
  return {};
}
