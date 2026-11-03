"use client";

import { type CSSProperties, useRef, useState } from "react";
import { accentStyle } from "@/lib/accents";
import { publicEnv } from "@/lib/env.public";
import {
  GALLERY_BUCKET,
  GALLERY_LIMIT,
  GALLERY_MAX_DIMENSION,
  fitWithin,
  galleryPhotoUrl,
  type GalleryPhoto,
} from "@/lib/gallery";
import { createClient } from "@/lib/supabase/client";
import { addGalleryPhoto, removeGalleryPhoto } from "./actions";

/**
 * Add and remove photos of the pro's work. Each photo is shrunk on the phone
 * (longest side 1600px, JPEG, no location data) and uploaded straight to their
 * folder in storage, then listed. Used on /dashboard/gallery and in the tour.
 */
export function GalleryManager({
  techId,
  initial,
  compact = false,
  accent,
  onSeeOnPage,
}: {
  techId: string;
  initial: GalleryPhoto[];
  /** The tour: a bigger add button and a single row of photos. */
  compact?: boolean;
  /** Tour: their page color, for the blank frames. */
  accent?: string;
  /** Tour: jump to the page card, scrolled to their photos. */
  onSeeOnPage?: () => void;
}) {
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const supabaseUrl = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const left = GALLERY_LIMIT - photos.length - busy;

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const picked = Array.from(files).slice(0, Math.max(0, left));
    if (picked.length < files.length) {
      setError(`Up to ${GALLERY_LIMIT} photos. Remove one to add more.`);
    }
    setBusy((n) => n + picked.length);
    const supabase = createClient();
    for (const file of picked) {
      try {
        const shrunk = await shrink(file);
        const path = `${techId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(GALLERY_BUCKET)
          .upload(path, shrunk.blob, {
            contentType: "image/jpeg",
            cacheControl: "31536000",
            upsert: false,
          });
        if (uploadError) throw uploadError;
        const result = await addGalleryPhoto({ path, width: shrunk.width, height: shrunk.height });
        if (result.ok) setPhotos((list) => [...list, result.photo]);
        else setError(result.error);
      } catch (err) {
        console.error("Gallery upload failed", err);
        setError("Couldn't add that photo. Try a different one, or try again.");
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (input.current) input.current.value = "";
  }

  async function remove(photo: GalleryPhoto) {
    setPhotos((list) => list.filter((p) => p.id !== photo.id));
    const { ok } = await removeGalleryPhoto(photo.id);
    if (!ok) {
      setPhotos((list) => [...list, photo]);
      setError("Couldn't remove that photo. Try again.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={input}
        id="gallery-photos"
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => void addFiles(e.target.files)}
      />
      {compact && (
        // The tour: a gliding strip first. Blank frames in their page's color until they add
        // photos, then their photos, moving the way they will on their page.
        <div
          className="-mx-6 overflow-hidden motion-reduce:overflow-x-auto"
          style={accentStyle(accent)}
        >
          <div
            className="marquee flex w-max gap-2 px-6"
            style={
              { "--marquee": `${Math.max(16, Math.max(photos.length, 4) * 4)}s` } as CSSProperties
            }
          >
            {photos.length > 0
              ? [...fill(photos), ...fill(photos)].map((photo, i, all) => (
                  // eslint-disable-next-line @next/next/no-img-element -- already sized on upload
                  <img
                    key={`${photo.id}-${i}`}
                    src={galleryPhotoUrl(supabaseUrl, photo.path)}
                    alt=""
                    className={`aspect-[4/5] h-40 w-auto rounded-2xl object-cover ${
                      i >= all.length / 2 ? "motion-reduce:hidden" : ""
                    }`}
                  />
                ))
              : Array.from({ length: 10 }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className={`from-brand-soft to-brand/35 text-brand flex aspect-[4/5] h-40 flex-col items-center justify-center gap-1 rounded-2xl border border-white/60 bg-gradient-to-br text-xs font-bold ${
                      i >= 5 ? "motion-reduce:hidden" : ""
                    }`}
                  >
                    <span className="text-2xl leading-none font-medium">＋</span>
                    Your work here
                  </span>
                ))}
          </div>
        </div>
      )}
      {left > 0 && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy > 0}
          className={`press border-brand/40 bg-brand-soft/40 text-brand flex w-full flex-col items-center justify-center gap-1 rounded-[22px] border-2 border-dashed font-bold disabled:opacity-60 ${
            compact ? "min-h-28 text-lg" : "min-h-20"
          }`}
        >
          <span aria-hidden className="text-2xl leading-none">
            ＋
          </span>
          {busy > 0
            ? `Adding ${busy} photo${busy === 1 ? "" : "s"}…`
            : photos.length
              ? "Add more photos"
              : "Add photos of your work"}
          <span className="text-muted text-xs font-medium">
            {photos.length} of {GALLERY_LIMIT}
          </span>
        </button>
      )}
      {error && <p className="text-danger text-sm">{error}</p>}
      {compact && photos.length > 0 && (
        <>
          {onSeeOnPage && (
            <button
              type="button"
              onClick={onSeeOnPage}
              className="press bg-ink text-pink flex min-h-12 items-center justify-center rounded-2xl px-4 font-bold"
            >
              See them on your page →
            </button>
          )}
          <p className="text-muted text-center text-xs">
            Remove or add more anytime under Profile → Your work photos.
          </p>
        </>
      )}
      {!compact && photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-black/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- already sized on upload */}
              <img
                src={galleryPhotoUrl(supabaseUrl, photo.path)}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => void remove(photo)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 flex size-11 items-start justify-end p-1"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-black/65 text-sm text-white">
                  ✕
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Enough copies to fill the tour's strip with only a photo or two. */
function fill(photos: GalleryPhoto[]): GalleryPhoto[] {
  return Array.from({ length: Math.ceil(4 / photos.length) }, () => photos).flat();
}

/** Shrinks a photo to JPEG at most GALLERY_MAX_DIMENSION px (drops EXIF, incl. location). */
async function shrink(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const image = await decode(file);
  const size = fitWithin(image.width, image.height, GALLERY_MAX_DIMENSION);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.drawImage(image.source, 0, 0, size.width, size.height);
  if ("close" in image.source) image.source.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob) throw new Error("Couldn't encode the photo");
  return { blob, ...size };
}

/** Decodes with the photo's own rotation; falls back to an <img> where needed. */
async function decode(
  file: File,
): Promise<{ source: ImageBitmap | HTMLImageElement; width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
