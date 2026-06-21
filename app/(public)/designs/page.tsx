import { getLorryDesigns } from "@/lib/data";
import Gallery, { type GalleryItem } from "@/components/site/Gallery";
import PageHeading from "@/components/site/PageHeading";

export const metadata = {
  title: "Design a Lorry · Welchfest 2026",
  description: "The Design a Lorry gallery from Welchfest, 13 June 2026.",
};

export default async function DesignsPage() {
  const designs = await getLorryDesigns();
  const winner = designs.find((d) => d.is_winner) ?? null;

  const items: GalleryItem[] = designs.map((d) => ({
    id: d.id,
    thumb: d.image_url,
    full: d.image_url,
    alt: `Lorry design by ${d.name}`,
    title: d.name,
    meta: d.employee_name ? [`✦ ${d.employee_name}`] : [],
    badge: d.is_winner ? "WINNER" : null,
    highlight: d.is_winner,
  }));

  return (
    <section>
      <PageHeading
        title="Design a Lorry"
        kicker="Drawing Competition"
        aside={`${designs.length} ${designs.length === 1 ? "design" : "designs"}`}
      >
        {winner
          ? `Winning design by ${winner.name}. Tap any entry for the full picture.`
          : "Every lorry the budding designers drew on the day."}
      </PageHeading>

      {items.length > 0 ? (
        <Gallery items={items} variant="designs" />
      ) : (
        <div className="border border-dashed border-ink/50 px-6 py-16 text-center font-mono text-sm uppercase tracking-[0.16em] text-faded">
          No designs on file yet.
        </div>
      )}
    </section>
  );
}
