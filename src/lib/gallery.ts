/*
 * The pro's work gallery: photos stored in the public "gallery" bucket under
 * <tech id>/<uuid>.jpg, listed in gallery_photos. Must match
 * supabase/migrations/20261023000000_work_gallery.sql. No server deps (tested).
 */

export const GALLERY_LIMIT = 12;
/** Longest side after the phone shrinks a photo before upload. */
export const GALLERY_MAX_DIMENSION = 1600;
export const GALLERY_BUCKET = "gallery";

export type GalleryPhoto = { id: string; path: string; width: number; height: number };

/** A file path a pro may add: their own folder, a uuid, .jpg. */
export function isOwnGalleryPath(techId: string, path: string): boolean {
  return new RegExp(
    `^${techId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg$`,
  ).test(path);
}

/** Public URL of a gallery photo. */
export function galleryPhotoUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${GALLERY_BUCKET}/${path}`;
}

/** The size to draw a photo at: longest side at most `max`, never upscaled. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
