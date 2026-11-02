"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { setUpCatering } from "@/lib/catering/starter";
import { publishProblems } from "@/lib/catering/setup";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { createClient, getUser } from "@/lib/supabase/server";
import { addOnSchema, blockedDateSchema, idSchema, packageSchema, settingsSchema } from "./schema";

async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

function refresh() {
  revalidatePath("/dashboard", "layout");
}

/** Turns on catering for a pro who picked another trade (or none). */
export async function startCatering(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await setUpCatering(supabase, user.id);
  refresh();
  redirect("/dashboard/catering");
}

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase
    .from("catering_settings")
    .upsert({ tech_id: user.id, ...parsed.data }, { onConflict: "tech_id" });
  if (error) {
    console.error("Saving catering settings failed", error);
    return { message: "Couldn't save. Try again.", values };
  }
  refresh();
  redirect("/dashboard/catering?saved=1");
}

/** Publish (if everything's ready) or unpublish the quote page. */
export async function setPublished(publish: boolean): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  if (publish) {
    const problems = await publishProblems(supabase, user.id);
    if (problems.length) redirect("/dashboard/catering?publish=blocked");
  }
  const { error } = await supabase
    .from("catering_settings")
    .update({ is_published: publish })
    .eq("tech_id", user.id);
  if (error) throw new Error(`Publishing failed: ${error.message}`);
  refresh();
  redirect(`/dashboard/catering${publish ? "?published=1" : ""}`);
}

// Packages

export async function createPackage(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = packageSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { error } = await supabase
    .from("catering_packages")
    .insert({ ...parsed.data, tech_id: user.id });
  if (error) {
    console.error("Creating package failed", error);
    return { message: "Couldn't save this package. Try again.", values };
  }
  refresh();
  redirect("/dashboard/catering/packages");
}

export async function updatePackage(
  packageId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const id = idSchema.safeParse(packageId);
  if (!id.success) notFound();
  const values = formValues(formData);
  const parsed = packageSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catering_packages")
    .update(parsed.data)
    .eq("id", id.data)
    .select("id");
  if (error) {
    console.error("Updating package failed", error);
    return { message: "Couldn't save this package. Try again.", values };
  }
  if (!data?.length) notFound();
  refresh();
  redirect("/dashboard/catering/packages");
}

export async function setPackageActive(packageId: string, isActive: boolean): Promise<void> {
  await requireUser();
  const id = idSchema.safeParse(packageId);
  if (!id.success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catering_packages")
    .update({ is_active: isActive })
    .eq("id", id.data)
    .select("id");
  if (error) throw new Error(`Updating package failed: ${error.message}`);
  if (!data?.length) notFound();
  refresh();
  redirect("/dashboard/catering/packages");
}

// Add-ons

export async function createAddOn(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = addOnSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { error } = await supabase
    .from("catering_addons")
    .insert({ ...parsed.data, tech_id: user.id });
  if (error) {
    console.error("Creating add-on failed", error);
    return { message: "Couldn't save this add-on. Try again.", values };
  }
  refresh();
  redirect("/dashboard/catering/packages");
}

export async function updateAddOn(
  addOnId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const id = idSchema.safeParse(addOnId);
  if (!id.success) notFound();
  const values = formValues(formData);
  const parsed = addOnSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catering_addons")
    .update(parsed.data)
    .eq("id", id.data)
    .select("id");
  if (error) {
    console.error("Updating add-on failed", error);
    return { message: "Couldn't save this add-on. Try again.", values };
  }
  if (!data?.length) notFound();
  refresh();
  redirect("/dashboard/catering/packages");
}

export async function setAddOnActive(addOnId: string, isActive: boolean): Promise<void> {
  await requireUser();
  const id = idSchema.safeParse(addOnId);
  if (!id.success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catering_addons")
    .update({ is_active: isActive })
    .eq("id", id.data)
    .select("id");
  if (error) throw new Error(`Updating add-on failed: ${error.message}`);
  if (!data?.length) notFound();
  refresh();
  redirect("/dashboard/catering/packages");
}

// Blocked dates

export async function blockDate(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = blockedDateSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { error } = await supabase
    .from("catering_blocked_dates")
    .upsert({ tech_id: user.id, ...parsed.data }, { onConflict: "tech_id,date" });
  if (error) {
    console.error("Blocking date failed", error);
    return { message: "Couldn't save. Try again.", values };
  }
  refresh();
  redirect("/dashboard/catering/dates");
}

export async function unblockDate(date: string): Promise<void> {
  const user = await requireUser();
  const parsed = blockedDateSchema.shape.date.safeParse(date);
  if (!parsed.success) notFound();
  const supabase = await createClient();
  const { error } = await supabase
    .from("catering_blocked_dates")
    .delete()
    .eq("tech_id", user.id)
    .eq("date", parsed.data);
  if (error) throw new Error(`Unblocking date failed: ${error.message}`);
  refresh();
  redirect("/dashboard/catering/dates");
}
