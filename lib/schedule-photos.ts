/** The private Storage bucket schedule photos live in (see migration
    20261110120000_schedule_photos.sql). */
export const SCHEDULE_PHOTO_BUCKET = "schedule-photos";

/** CSS position for a photo's focal point (object-position or
    background-position). No point means centred. */
export function photoFocusPosition(x?: number | null, y?: number | null) {
  if (x == null || y == null) return "50% 50%";
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  return `${clamp(x)}% ${clamp(y)}%`;
}

/** The bucket refuses anything larger. */
export const SCHEDULE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/** Longest side after resizing. Enough for a wide box on a desktop and for a
    PNG/PDF export, small enough that a photo is a few hundred KB. */
const MAX_SIDE = 1280;

/** Where a new photo for an item goes. The random name means a replaced photo
    never reuses a URL the browser has cached. */
export function schedulePhotoPath(projectId: string, itemId: string, extension: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${projectId}/${itemId}/${random}.${extension}`;
}

/**
 * Shrinks a picked photo in the browser before it is uploaded: longest side
 * MAX_SIDE, WebP where the browser can encode it (JPEG otherwise), quality
 * stepped down until it fits under the bucket's limit.
 */
export async function compressSchedulePhoto(file: File): Promise<{ blob: Blob; extension: string; type: string }> {
  if (!file.type.startsWith("image/")) throw new Error("not-an-image");

  const source = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no-canvas");
  context.drawImage(source.image, 0, 0, width, height);
  source.release();

  for (const quality of [0.8, 0.7, 0.55, 0.4]) {
    const webp = await toBlob(canvas, "image/webp", quality);
    // Safari before 17 quietly returns a PNG when asked for WebP.
    const blob = webp && webp.type === "image/webp" ? webp : await toBlob(canvas, "image/jpeg", quality);
    if (!blob) throw new Error("encode-failed");
    if (blob.size <= SCHEDULE_PHOTO_MAX_BYTES) {
      const isWebp = blob.type === "image/webp";
      return { blob, extension: isWebp ? "webp" : "jpg", type: isWebp ? "image/webp" : "image/jpeg" };
    }
  }
  throw new Error("too-large");
}

async function loadImage(file: File): Promise<{
  image: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}> {
  // createImageBitmap honours EXIF orientation, so a portrait phone photo
  // stays upright.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Fall through to an <img>, which some browsers decode more formats with.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { image, width: image.naturalWidth, height: image.naturalHeight, release: () => undefined };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}
