import { permanentRedirect } from "next/navigation";

/** Menu pages moved to the root (getdibs.pro/<slug>); old /b/ links in bios still work. */
export default async function OldMenuPage({ params }: PageProps<"/b/[slug]">) {
  permanentRedirect(`/${encodeURIComponent((await params).slug.toLowerCase())}`);
}
