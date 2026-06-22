import { getTrucksByBand } from "@/lib/data";
import {
  BAND_LABEL,
  BAND_ORDER,
  PLACEMENT_LABEL,
  type Truck,
} from "@/lib/trucks";
import PageHeading from "@/components/site/PageHeading";
import PlacementBadge from "@/components/site/PlacementBadge";

export const metadata = {
  title: "Truck Awards · Welchfest 2026",
  description: "Best Truck results by fleet — the judged winners of Welchfest.",
};

export default async function AwardsPage() {
  const trucks = await getTrucksByBand();
  const total = BAND_ORDER.reduce((n, b) => n + trucks[b].length, 0);

  return (
    <section className="flex flex-col gap-9">
      <PageHeading
        title="Truck Awards"
        kicker="Best Truck · Judged Result"
        aside={`${total} entries`}
      >
        Voting decided the running order; the judges had the final say. Rosettes
        mark the placed trucks in each fleet.
      </PageHeading>

      {total === 0 ? (
        <div className="border border-dashed border-ink/50 px-6 py-16 text-center font-mono text-sm uppercase tracking-[0.16em] text-faded">
          No trucks recorded yet.
        </div>
      ) : (
        BAND_ORDER.map((band) => {
          const rows = trucks[band];
          if (rows.length === 0) return null;
          return (
            <div key={band}>
              <div className="mb-3 flex items-baseline gap-3 border-b border-ink pb-1.5">
                <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-ink">
                  {BAND_LABEL[band]}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faded">
                  {rows.length} {rows.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {rows.map((t) => (
                  <li key={t.id}>
                    <TruckCard truck={t} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}

function TruckCard({ truck }: { truck: Truck }) {
  const placed = truck.placement !== null;
  const thumb = truck.photo_url;
  return (
    <div
      className={`relative flex h-full flex-col border bg-card shadow-[2px_2px_0_rgba(30,27,22,0.18)] ${
        truck.placement === 1 ? "border-blue-deep ring-2 ring-blue-deep" : "border-ink"
      }`}
    >
      {placed && (
        <div className="absolute -right-2 -top-3 z-10 drop-shadow">
          <PlacementBadge place={truck.placement as 1 | 2 | 3} />
        </div>
      )}
      <div className="aspect-[4/3] overflow-hidden bg-card-deep">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={truck.display_name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs text-faded">
            NO PHOTO
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="font-sans text-base font-bold leading-tight">
          {truck.display_name}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-faded">
          {truck.driver_name ? `${truck.driver_name} · ` : ""}
          <span className="text-blue">{truck.depot}</span> · {truck.year}
        </div>
        <div className="mt-auto pt-2 font-mono text-xs font-bold tabular-nums">
          {truck.vote_count} VOTE{truck.vote_count === 1 ? "" : "S"}
          {placed && (
            <span className="ml-2 text-blue-deep">
              {PLACEMENT_LABEL[truck.placement as 1 | 2 | 3]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
