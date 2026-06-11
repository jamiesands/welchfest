// Client-side JPEG resize + compress.
// Uses createImageBitmap with imageOrientation: 'from-image' so EXIF
// orientation is baked into the resulting bitmap.

export type ResizeOpts = {
  maxEdge: number;
  quality: number;
};

// Formats a plain <img> tag renders everywhere (feed, wall, gallery).
// Anything else — HEIC from iPhones above all — must be converted before
// upload or it shows as a broken tile for every Android/laptop viewer
// (HARDENING-AUDIT.md C5).
const WEB_SAFE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isWebSafeImage(file: File): boolean {
  return WEB_SAFE_TYPES.has(file.type.toLowerCase());
}

async function convertToJpeg(file: File, opts: ResizeOpts): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  const { width, height } = bitmap;
  const longEdge = Math.max(width, height);
  const scale = longEdge > opts.maxEdge ? opts.maxEdge / longEdge : 1;
  const outW = Math.round(width * scale);
  const outH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("canvas 2d context unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, outW, outH);
  bitmap.close();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("canvas.toBlob returned null"));
        else resolve(blob);
      },
      "image/jpeg",
      opts.quality
    );
  });
}

// Decide what actually gets uploaded for a picked file:
// - web-safe and small: pass through untouched (existing behaviour);
// - large or non-web format (HEIC…): convert to JPEG;
// - conversion fails on a web-safe original: upload the original — it
//   still renders;
// - conversion fails on a non-web format: reject with a guest-readable
//   message rather than publishing an image nobody else can see.
export async function prepareImageForUpload(
  file: File,
  opts: ResizeOpts,
  compressThreshold: number
): Promise<Blob> {
  const webSafe = isWebSafeImage(file);
  if (webSafe && file.size <= compressThreshold) return file;
  try {
    return await convertToJpeg(file, opts);
  } catch (err) {
    if (webSafe) return file;
    throw new Error(
      "This photo's format couldn't be converted on this phone. Try a screenshot of it, or set the camera to 'Most Compatible' and retake.",
      { cause: err }
    );
  }
}
