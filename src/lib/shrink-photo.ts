import { fitWithin } from "./gallery";

/*
 * Shrinks a photo on the phone before upload: JPEG at most `max` px on its longest
 * side, which also drops EXIF, location included. Browser only.
 */
export async function shrinkPhoto(
  file: File,
  max: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const image = await decode(file);
  const size = fitWithin(image.width, image.height, max);
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
