import { getApprovedPhotos } from "@/lib/data";
import { unit3 } from "@/lib/photos";
import Gallery, { type GalleryItem } from "@/components/site/Gallery";
import PageHeading from "@/components/site/PageHeading";

export const metadata = {
  title: "Photos · Welchfest 2026",
  description: "The guest photo gallery from Welchfest, 13 June 2026.",
};

export default async function PhotosPage() {
  const photos = await getApprovedPhotos();

  const items: GalleryItem[] = photos.map((p) => {
    const who = [p.guest_name, p.depot].filter(Boolean).join(" · ");
    return {
      id: p.id,
      thumb: p.url,
      full: p.url,
      alt: p.caption ?? `Welchfest unit ${unit3(p.unit_number)}`,
      title: p.caption,
      meta: [who, `Unit ${unit3(p.unit_number)}`].filter(Boolean) as string[],
    };
  });

  return (
    <section>
      <PageHeading
        title="Photos"
        kicker="Manifest · Guest Gallery"
        aside={`${photos.length} on file`}
      >
        Every shot guests posted on the day, in the order it came in.
      </PageHeading>

      {items.length > 0 ? (
        <Gallery items={items} variant="photos" />
      ) : (
        <EmptyNote>No photos on file yet.</EmptyNote>
      )}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-ink/50 px-6 py-16 text-center font-mono text-sm uppercase tracking-[0.16em] text-faded">
      {children}
    </div>
  );
}
