import Link from "next/link";
import {
  getApprovedPhotos,
  getLorryDesigns,
  getTrucksByBand,
  hasLeaderboard,
} from "@/lib/data";
import { BAND_ORDER } from "@/lib/trucks";
import WBPostmark from "@/components/waybill/WBPostmark";

export const metadata = {
  title: "Welchfest 2026",
  description:
    "Welchfest — the Welch Group summer party, 13 June 2026. A manifest of memories.",
};

export default async function HomePage() {
  const [photos, trucks, designs, leaderboardOn] = await Promise.all([
    getApprovedPhotos(),
    getTrucksByBand(),
    getLorryDesigns(),
    hasLeaderboard(),
  ]);

  const truckCount = BAND_ORDER.reduce((n, b) => n + trucks[b].length, 0);
  const hero = photos[0] ?? null;
  const heroUrl = hero ? hero.url : null;

  const cards = [
    { href: "/photos", label: "Photos", count: photos.length, note: "Guest gallery" },
    { href: "/awards", label: "Truck Awards", count: truckCount, note: "Best in fleet" },
    { href: "/designs", label: "Design a Lorry", count: designs.length, note: "Drawings" },
    ...(leaderboardOn
      ? [{ href: "/leaderboard", label: "Leaderboard", count: null, note: "Penalty shootout" }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden border border-ink bg-ink text-paper shadow-[3px_3px_0_rgba(30,27,22,0.25)]">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/10" />
        <div className="relative flex min-h-[58vw] max-h-[460px] flex-col justify-end gap-2 p-5 sm:min-h-[340px] sm:p-8">
          <div className="flex items-center gap-3">
            <WBPostmark color="#cfe1ee" size={64} />
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-blue-soft">
              Welch Group · Est. 1934
            </div>
          </div>
          <h1 className="font-sans text-4xl font-bold leading-[0.95] tracking-tight sm:text-6xl">
            WELCHFEST
          </h1>
          <p className="max-w-xl font-sans text-base leading-snug text-paper/90 sm:text-lg">
            The Welch Group summer party — a manifest of memories from the day.
          </p>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-blue-soft sm:text-sm">
            13 June 2026 · Filed &amp; sealed
          </div>
        </div>
      </section>

      <nav aria-label="Sections" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-center justify-between border border-ink bg-card px-4 py-4 shadow-[2px_2px_0_rgba(30,27,22,0.18)] transition-colors hover:bg-card-deep"
          >
            <div>
              <div className="font-sans text-lg font-bold leading-tight">
                {c.label}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-faded">
                {c.note}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {c.count !== null && (
                <span className="font-mono text-xl font-bold tabular-nums text-blue-deep">
                  {c.count}
                </span>
              )}
              <span aria-hidden className="font-mono text-blue-deep">
                →
              </span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
