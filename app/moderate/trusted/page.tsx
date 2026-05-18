import Link from "next/link";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function TrustedPage() {
  const sb = supabaseAdmin();
  const { count } = await sb
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("trust_status", "trusted");
  const { count: totalCount } = await sb
    .from("guests")
    .select("id", { count: "exact", head: true });

  const trusted = count ?? 0;
  const total = totalCount ?? 0;
  const pct = total > 0 ? Math.round((trusted / total) * 100) : 0;

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto">
      <WBLetterhead subtitle="Trusted Guests" code="Form W/MOD-T" />
      <div style={{ padding: "20px 18px", flex: 1 }}>
        <WBLabel>Auto-approval pool</WBLabel>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--color-blue-deep)",
            marginTop: 6,
          }}
        >
          {trusted}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-faded)",
            letterSpacing: "0.1em",
            marginTop: 6,
          }}
        >
          of {total} guests · {pct}% trusted
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--color-ink)",
            opacity: 0.75,
            marginTop: 20,
            border: "1px dashed var(--color-ink)",
            padding: "12px 14px",
          }}
        >
          A guest is promoted to <strong>trusted</strong> the moment any of
          their uploads is approved. Trusted uploads bypass this queue.
        </div>
        <Link
          href="/moderate"
          style={{
            display: "inline-block",
            marginTop: 24,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            color: "var(--color-blue-deep)",
            fontWeight: 700,
          }}
        >
          ← BACK TO QUEUE
        </Link>
      </div>
    </main>
  );
}
