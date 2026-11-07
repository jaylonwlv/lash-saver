"use client";

import { useRef, useState } from "react";
import { publicEnv } from "@/lib/env.public";
import { GALLERY_BUCKET, galleryPhotoUrl } from "@/lib/gallery";
import { shrinkPhoto } from "@/lib/shrink-photo";
import { createClient } from "@/lib/supabase/client";
import { setPortrait } from "./portrait-actions";

/** Shown small, so it doesn't need the gallery's larger size. */
const PORTRAIT_MAX_DIMENSION = 800;

/**
 * The pro's portrait, beside "About you" on their page. Shrunk on the phone and
 * uploaded straight to their folder, like gallery photos. Saves as soon as it's
 * picked, separately from the profile form.
 */
export function PortraitPicker({ techId, initial }: { techId: string; initial: string | null }) {
  const [path, setPath] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { blob } = await shrinkPhoto(file, PORTRAIT_MAX_DIMENSION);
      const next = `${techId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await createClient()
        .storage.from(GALLERY_BUCKET)
        .upload(next, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (uploadError) throw uploadError;
      const result = await setPortrait(next);
      if (result.ok) setPath(next);
      else setError(result.error);
    } catch (err) {
      console.error("Portrait upload failed", err);
      setError("Couldn't add that photo. Try a different one, or try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await setPortrait(null);
    if (result.ok) setPath(null);
    else setError(result.error);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Your photo (optional)</span>
      <div className="flex items-center gap-4">
        {path ? (
          // eslint-disable-next-line @next/next/no-img-element -- already sized on upload
          <img
            src={galleryPhotoUrl(publicEnv().NEXT_PUBLIC_SUPABASE_URL, path)}
            alt=""
            className="size-20 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="bg-brand-soft text-brand flex size-20 items-center justify-center rounded-full text-2xl"
          >
            ＋
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*"
            aria-label="Choose your photo"
            className="sr-only"
            onChange={(e) => void pick(e.target.files)}
          />
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="press border-line min-h-12 rounded-full border px-5 font-semibold disabled:opacity-60"
          >
            {busy ? "Saving…" : path ? "Change" : "Add a photo"}
          </button>
          {path && (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="press text-muted min-h-12 px-3 font-semibold disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error ? (
        <p className="text-danger text-sm">{error}</p>
      ) : (
        <p className="text-muted text-sm">It appears beside &quot;About you&quot; on your page.</p>
      )}
    </div>
  );
}
