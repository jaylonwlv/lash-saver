"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ACCENT_IDS } from "@/lib/accents";
import { PAGE_STYLE_IDS } from "@/lib/page-styles";
import { createClient, getUser } from "@/lib/supabase/server";

const lookSchema = z.object({
  page_style: z.enum(PAGE_STYLE_IDS),
  accent_color: z.enum(ACCENT_IDS),
});

/** Saves the look picked in the tour's live preview, the moment it's tapped. */
export async function savePageLook(look: unknown): Promise<{ ok: boolean }> {
  const user = await getUser();
  const parsed = lookSchema.safeParse(look);
  if (!user || !parsed.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) {
    console.error("Saving page look failed", error);
    return { ok: false };
  }
  revalidatePath("/dashboard/profile");
  return { ok: true };
}
