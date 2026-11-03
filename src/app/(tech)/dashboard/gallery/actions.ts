"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GALLERY_BUCKET, isOwnGalleryPath, type GalleryPhoto } from "@/lib/gallery";
import { createClient, getUser } from "@/lib/supabase/server";

const addSchema = z.object({
  path: z.string().max(200),
  width: z.number().int().min(1).max(10000),
  height: z.number().int().min(1).max(10000),
});

type Result = { ok: true; photo: GalleryPhoto } | { ok: false; error: string };

/**
 * Lists a photo the pro just uploaded (from their phone, straight to storage) in
 * their gallery. If it can't be listed (full, bad path), the file is removed.
 */
export async function addGalleryPhoto(input: unknown): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in again to add photos." };
  const parsed = addSchema.safeParse(input);
  if (!parsed.success || !isOwnGalleryPath(user.id, parsed.data.path)) {
    return { ok: false, error: "That photo didn't upload properly. Try again." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .insert({ tech_id: user.id, ...parsed.data })
    .select("id, path, width, height")
    .single();
  if (error || !data) {
    await supabase.storage.from(GALLERY_BUCKET).remove([parsed.data.path]);
    if (error?.message.includes("gallery_full")) {
      return { ok: false, error: "Your gallery is full. Remove a photo to add another." };
    }
    console.error("Adding gallery photo failed", error);
    return { ok: false, error: "Couldn't add that photo. Try again." };
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true, photo: data };
}

/** Removes one of the pro's own photos, from the list and from storage. */
export async function removeGalleryPhoto(id: unknown): Promise<{ ok: boolean }> {
  const user = await getUser();
  const parsed = z.uuid().safeParse(id);
  if (!user || !parsed.success) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .delete()
    .eq("id", parsed.data)
    .eq("tech_id", user.id)
    .select("path");
  if (error) {
    console.error("Removing gallery photo failed", error);
    return { ok: false };
  }
  const paths = (data ?? []).map((r) => r.path);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(GALLERY_BUCKET).remove(paths);
    if (storageError) console.error("Removing gallery file failed", storageError);
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
