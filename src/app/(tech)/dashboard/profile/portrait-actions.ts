"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GALLERY_BUCKET, isOwnGalleryPath } from "@/lib/gallery";
import { createClient, getUser } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Sets the portrait the pro just uploaded, or clears it (null), then deletes the
 * old file. If the new one can't be saved, its file is removed.
 */
export async function setPortrait(input: unknown): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in again to change your photo." };
  const parsed = z.string().max(200).nullable().safeParse(input);
  if (!parsed.success || (parsed.data !== null && !isOwnGalleryPath(user.id, parsed.data))) {
    return { ok: false, error: "That photo didn't upload properly. Try again." };
  }
  const path = parsed.data;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("portrait_path")
    .eq("id", user.id)
    .single();
  const { error } = await supabase
    .from("profiles")
    .update({ portrait_path: path })
    .eq("id", user.id);
  if (error) {
    console.error("Saving portrait failed", error);
    if (path) await supabase.storage.from(GALLERY_BUCKET).remove([path]);
    return { ok: false, error: "Couldn't save your photo. Try again." };
  }
  const old = profile?.portrait_path;
  if (old && old !== path) {
    const { error: storageError } = await supabase.storage.from(GALLERY_BUCKET).remove([old]);
    if (storageError) console.error("Removing old portrait failed", storageError);
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
