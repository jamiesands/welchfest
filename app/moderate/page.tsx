import WBLetterhead from "@/components/waybill/WBLetterhead";
import ModerateQueueClient from "@/components/feed/ModerateQueueClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PhotoWithGuest } from "@/lib/photos";

export const dynamic = "force-dynamic";

const COLS =
  "id, unit_number, guest_id, storage_path, type, caption, status, created_at, moderated_at, guest:guests(name, depot)";

export default async function ModeratePage() {
  const sb = supabaseAdmin();
  const [liveRes, removedRes] = await Promise.all([
    sb
      .from("photos")
      .select(COLS)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200),
    sb
      .from("photos")
      .select(COLS)
      .eq("status", "hidden")
      .order("moderated_at", { ascending: false, nullsFirst: false })
      .limit(200),
  ]);

  const live = (liveRes.data ?? []) as unknown as PhotoWithGuest[];
  const removed = (removedRes.data ?? []) as unknown as PhotoWithGuest[];

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto relative">
      <WBLetterhead subtitle="Moderation" code="Form W/MOD" />
      <ModerateQueueClient initialLive={live} initialRemoved={removed} />
    </main>
  );
}
