import { notFound } from "next/navigation";
import { getLeaderboard, type PenaltyEntry } from "@/lib/data";
import PageHeading from "@/components/site/PageHeading";

export const metadata = {
  title: "Leaderboard · Welchfest 2026",
  description: "Penalty-shootout leaderboard from Welchfest, 13 June 2026.",
};

const RANK_TONE = [
  "bg-[#c7a14a] text-[#2e2206]", // 1
  "bg-[#a7a7af] text-[#26262d]", // 2
  "bg-[#b9794a] text-[#311e0e]", // 3
];

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();

  // The page (and its nav entry) only exist once the table has rows.
  if (rows.length === 0) notFound();

  return (
    <section>
      <PageHeading
        title="Penalty Shootout"
        kicker="Leaderboard · Final Standings"
        aside={`${rows.length} ${rows.length === 1 ? "player" : "players"}`}
      >
        Highest score takes the top spot.
      </PageHeading>

      <ol className="flex flex-col divide-y divide-ink/15 border border-ink bg-card shadow-[2px_2px_0_rgba(30,27,22,0.18)]">
        {rows.map((row, i) => (
          <LeaderboardRow key={row.id} row={row} rank={i + 1} />
        ))}
      </ol>
    </section>
  );
}

function LeaderboardRow({ row, rank }: { row: PenaltyEntry; rank: number }) {
  const tone = rank <= 3 ? RANK_TONE[rank - 1] : "bg-card-deep text-ink";
  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:px-4">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center font-mono text-sm font-bold tabular-nums ${tone}`}
        aria-hidden
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-sans text-base font-bold leading-tight">
          {row.player_name}
        </div>
        {row.depot && (
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue">
            {row.depot}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-xl font-bold tabular-nums leading-none">
          {row.score}
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-faded">
          {row.score === 1 ? "goal" : "goals"}
        </div>
      </div>
    </li>
  );
}
