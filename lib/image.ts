// Client-side JPEG resize + compress.
// Uses createImageBitmap with imageOrientation: 'from-image' so EXIF
// orientation is baked into the resulting bitmap. Falls back to the raw blob
// if the browser refuses the file (e.g. HEIC on older Safari) — the photos
// table will still receive the original.

export type ResizeOpts = {
  maxEdge: number;
  quality: number;
};

export async function resizeAndCompress(file: File, opts: ResizeOpts): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

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
    return file;
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
