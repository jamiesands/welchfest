"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE_ITEMS = [
  { href: "/photos", label: "Photos" },
  { href: "/awards", label: "Truck Awards" },
  { href: "/designs", label: "Design a Lorry" },
];

const LEADERBOARD_ITEM = { href: "/leaderboard", label: "Leaderboard" };

// The Leaderboard entry only appears once the penalty-shootout table has rows;
// the gate is computed server-side in the layout and passed down.
export default function SiteNav({
  leaderboardEnabled,
}: {
  leaderboardEnabled: boolean;
}) {
  const pathname = usePathname();
  const items = leaderboardEnabled
    ? [...BASE_ITEMS, LEADERBOARD_ITEM]
    : BASE_ITEMS;

  return (
    <nav className="border-b border-ink bg-card-deep">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] sm:text-sm">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "border-b-2 border-blue-deep pb-1 font-bold text-ink"
                    : "text-ink/60 transition-colors hover:text-ink"
                }
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
