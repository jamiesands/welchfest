// Helpers for turning a Supabase Storage public object URL into a resized
// render URL. Supabase serves transformed images from
//   /storage/v1/render/image/public/<bucket>/<path>?width=&quality=
// which is the same path as the plain public object, with /object/ swapped
// for /render/image/ and a transform query appended. We use render URLs for
// grid thumbnails and the untouched object URL for full-res lightbox views.

const OBJECT_SEGMENT = "/storage/v1/object/public/";
const RENDER_SEGMENT = "/storage/v1/render/image/public/";

type Transform = {
  width: number;
  quality?: number;
};

/**
 * Resized thumbnail URL for a Supabase public object URL. Non-Supabase URLs
 * (or nullish input) are returned unchanged so the caller can render whatever
 * it has.
 */
export function thumbUrl(
  url: string | null | undefined,
  { width, quality = 70 }: Transform
): string | null {
  if (!url) return null;
  if (!url.includes(OBJECT_SEGMENT)) return url;
  const base = url.replace(OBJECT_SEGMENT, RENDER_SEGMENT);
  const params = new URLSearchParams({
    width: String(width),
    quality: String(quality),
  });
  return `${base}?${params.toString()}`;
}
