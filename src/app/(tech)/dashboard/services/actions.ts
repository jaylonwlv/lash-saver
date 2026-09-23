"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { createClient, getUser } from "@/lib/supabase/server";
import { serviceIdSchema, serviceSchema } from "./schema";

async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

function done(): never {
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/services");
}

export async function createService(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = serviceSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({ ...parsed.data, tech_id: user.id });
  if (error) {
    console.error("Creating service failed", error);
    return { message: "Couldn't save this service. Try again.", values };
  }
  done();
}

export async function updateService(
  serviceId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const id = serviceIdSchema.safeParse(serviceId);
  if (!id.success) notFound();

  const values = formValues(formData);
  const parsed = serviceSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  // RLS limits this to the tech's own services; zero rows back means not theirs.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .update(parsed.data)
    .eq("id", id.data)
    .select("id");
  if (error) {
    console.error("Updating service failed", error);
    return { message: "Couldn't save this service. Try again.", values };
  }
  if (!data?.length) notFound();
  done();
}

/** Hide a service from the booking page, or show it again. Past bookings keep it. */
export async function setServiceActive(serviceId: string, isActive: boolean) {
  await requireUser();
  const id = serviceIdSchema.safeParse(serviceId);
  if (!id.success) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", id.data)
    .select("id");
  if (error) throw new Error(`Updating service failed: ${error.message}`);
  if (!data?.length) notFound();
  done();
}
