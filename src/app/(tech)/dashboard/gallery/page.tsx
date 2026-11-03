import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { createClient, getUser } from "@/lib/supabase/server";
import { GalleryManager } from "./gallery-manager";

export const metadata: Metadata = { title: "Your work" };

export default async function GalleryPage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: photos, error } = await supabase
    .from("gallery_photos")
    .select("id, path, width, height")
    .eq("tech_id", user!.id)
    .order("created_at");
  if (error) throw new Error(`Loading gallery failed: ${error.message}`);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard" label="Dashboard" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Your work</h1>
        <p className="text-muted text-sm">
          Photos glide across your page so new clients see what they&apos;re booking. Optional, up
          to 12. Only post photos you took or have permission to use.
        </p>
      </div>
      <GalleryManager techId={user!.id} initial={photos ?? []} />
    </div>
  );
}
