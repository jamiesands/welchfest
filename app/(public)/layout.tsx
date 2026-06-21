import type { ReactNode } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { hasLeaderboard } from "@/lib/data";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const leaderboardEnabled = await hasLeaderboard();
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <SiteHeader />
      <SiteNav leaderboardEnabled={leaderboardEnabled} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
