"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";
import { supabase, type Guest } from "@/lib/supabase";

export default function FeedPage() {
  const router = useRouter();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("welchfest:guest_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("id, name, depot, consent_given, created_at")
        .eq("id", id)
        .single<Guest>();
      if (cancelled) return;
      if (error || !data) {
        localStorage.removeItem("welchfest:guest_id");
        router.replace("/join");
        return;
      }
      setGuest(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto">
      <WBLetterhead subtitle="Manifest in progress" code="Form W/LOG-26" />
      <div style={{ padding: "18px 18px 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <WBLabel style={{ marginBottom: 6 }}>You are filed</WBLabel>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 25,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
          }}
        >
          {loading || !guest ? "Loading…" : `You're in, ${guest.name}.`}
        </div>
        {guest && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              marginTop: 6,
              color: "var(--color-faded)",
              letterSpacing: "0.06em",
            }}
          >
            {guest.depot} · entry №{guest.id.slice(0, 8)}
          </div>
        )}

        <div
          style={{
            marginTop: 22,
            border: "1.5px solid var(--color-ink)",
            background: "var(--color-card)",
            padding: "14px 16px",
          }}
        >
          <WBLabel>Next dispatch</WBLabel>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.3,
              marginTop: 4,
            }}
          >
            Feed coming soon.
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--color-faded)",
              marginTop: 6,
              lineHeight: 1.5,
              letterSpacing: "0.04em",
            }}
          >
            Photos, 360°s, song requests and awards arrive on the day. Keep this
            page on your home screen — it&rsquo;ll wake up at the depot.
          </div>
        </div>
      </div>
    </main>
  );
}
