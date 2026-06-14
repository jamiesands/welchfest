import Link from "next/link";
import AdminGate from "@/components/admin/AdminGate";

type Tool = { href: string; title: string; blurb: string; tag: string };

const JUDGING: Tool[] = [
  {
    href: "/admin/trucks",
    title: "Truck Awards",
    blurb: "Set 1st / 2nd / 3rd per fleet, with the live vote tally as a guide.",
    tag: "PLACEMENTS",
  },
  {
    href: "/admin/designs",
    title: "Design a Lorry",
    blurb: "Pick the single winning lorry design.",
    tag: "WINNER",
  },
  {
    href: "/admin/leaderboard",
    title: "Penalty Shootout",
    blurb: "Add, edit and remove leaderboard scores. The page appears once it has rows.",
    tag: "SCORES",
  },
];

const OPS: Tool[] = [
  {
    href: "/moderate",
    title: "Photo moderation",
    blurb: "Hide a photo from the public gallery after the fact. (Own login.)",
    tag: "MOD",
  },
];

const PREVIEWS = [
  { href: "/", label: "Home" },
  { href: "/photos", label: "Photos" },
  { href: "/awards", label: "Awards" },
  { href: "/designs", label: "Designs" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function AdminIndexPage() {
  return (
    <AdminGate subtitle="Control Room" code="Form W/ADM">
      <div className="flex flex-col gap-6 px-[18px] pb-8 pt-4">
        <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-faded">
          Writes go through the service role and require the moderator cookie —
          if a save is rejected, log in at{" "}
          <Link href="/moderate/login" className="text-blue-deep underline">
            /moderate
          </Link>{" "}
          first.
        </p>

        <Section title="Judging" subtitle="Set the results">
          {JUDGING.map((t) => (
            <ToolCard key={t.href} tool={t} />
          ))}
        </Section>

        <Section title="Operations" subtitle="After the fact">
          {OPS.map((t) => (
            <ToolCard key={t.href} tool={t} />
          ))}
        </Section>

        <Section title="Public views" subtitle="What guests see">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PREVIEWS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="border-[1.5px] border-ink bg-card px-3 py-2.5 font-mono text-[11px] font-bold tracking-[0.12em] text-blue-deep"
              >
                {p.label}
              </Link>
            ))}
          </div>
        </Section>
      </div>
    </AdminGate>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2.5 border-b-[1.5px] border-ink pb-1">
        <h2 className="font-sans text-base font-bold leading-none">{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faded">
          {subtitle}
        </span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={tool.href}
      className="flex items-center gap-3 border-[1.5px] border-ink bg-card px-3.5 py-3 shadow-[2px_2px_0_rgba(30,27,22,0.18)]"
    >
      <div className="min-w-0 flex-1">
        <div className="font-sans text-[15px] font-bold leading-tight">
          {tool.title}
        </div>
        <div className="mt-0.5 font-mono text-[10px] leading-snug tracking-[0.04em] text-faded">
          {tool.blurb}
        </div>
        <div className="mt-1 font-mono text-[10px] tracking-[0.16em] text-blue-deep">
          {tool.href}
        </div>
      </div>
      <div className="shrink-0 bg-ink px-1.5 py-1 font-mono text-[9px] font-bold tracking-[0.22em] text-paper">
        {tool.tag}
      </div>
    </Link>
  );
}
