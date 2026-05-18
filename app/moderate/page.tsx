import Link from "next/link";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import ModerateQueueClient from "@/components/feed/ModerateQueueClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PhotoWithGuest } from "@/lib/photos";

export const dynamic = "force-dynamic";

export default async function ModeratePage() {
  const sb = supabaseAdmin();
  const [pendingRes, hiddenRes, trustedRes] = await Promise.all([
    sb
      .from("photos")
      .select(
        "id, unit_number, guest_id, storage_path, type, caption, status, created_at, moderated_at, guest:guests(name, depot)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100),
    sb
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("status", "hidden")
      .gte("moderated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    sb
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("trust_status", "trusted"),
  ]);

  const pending = (pendingRes.data ?? []) as unknown as PhotoWithGuest[];
  const hiddenToday = hiddenRes.count ?? 0;
  const trustedCount = trustedRes.count ?? 0;

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto relative">
      <WBLetterhead subtitle="Moderation Queue" code="Form W/MOD" />
      <ModerateQueueClient initial={pending} initialHiddenToday={hiddenToday} />

      <div
        className="fixed bottom-0 inset-x-0 mx-auto max-w-md"
        style={{
          borderTop: "1.5px solid var(--color-ink)",
          background: "var(--color-card)",
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
        }}
      >
        <Link
          href="/moderate/trusted"
          style={{ color: "var(--color-blue-deep)", fontWeight: 700 }}
        >
          TRUSTED · {trustedCount}
        </Link>
        <span style={{ color: "var(--color-faded)" }}>FORM W/MOD · REV. 04</span>
      </div>
    </main>
  );
}
