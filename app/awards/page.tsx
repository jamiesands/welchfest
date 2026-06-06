"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";
import WBStamp from "@/components/waybill/WBStamp";
import WBHint from "@/components/waybill/WBHint";
import { supabase } from "@/lib/supabase";
import {
  BAND_LABEL,
  BAND_ORDER,
  TRUCK_COLS,
  type Band,
  type Truck,
} from "@/lib/trucks";

export default function AwardsPage() {
  const router = useRouter();
  const [guestId, setGuestId] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [myVotes, setMyVotes] = useState<Record<Band, string | undefined>>({
    new: undefined,
    mid: undefined,
    veteran: undefined,
  });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("welchfest:guest_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("guests")
        .select("id")
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (!data) {
        router.replace("/join");
        return;
      }
      setGuestId(id);
      setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const fetchAll = useCallback(async () => {
    if (!guestId) return;
    const [trucksRes, votesRes] = await Promise.all([
      supabase
        .from("trucks")
        .select(TRUCK_COLS)
        .order("vote_count", { ascending: false })
        .order("display_name", { ascending: true }),
      supabase
        .from("truck_votes")
        .select("band, truck_id")
        .eq("guest_id", guestId),
    ]);
    if (trucksRes.data) setTrucks(trucksRes.data as unknown as Truck[]);
    if (votesRes.data) {
      const map: Record<Band, string | undefined> = {
        new: undefined,
        mid: undefined,
        veteran: undefined,
      };
      for (const v of votesRes.data as { band: Band; truck_id: string }[]) {
        map[v.band] = v.truck_id;
      }
      setMyVotes(map);
    }
  }, [guestId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  // Realtime: trucks UPDATE delivers the new vote_count via the trigger;
  // truck_votes INSERT (filtered to my guest_id) keeps the voted state
  // in sync across my own open tabs.
  useEffect(() => {
    if (!bootstrapped) return;
    const channel = supabase
      .channel("welchfest-trucks-vote")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "welchfest", table: "trucks" },
        (payload) => {
          const updated = payload.new as Truck;
          setTrucks((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "welchfest", table: "trucks" },
        () => {
          fetchAll();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "welchfest", table: "trucks" },
        (payload) => {
          const oldId = (payload.old as { id: string }).id;
          setTrucks((prev) => prev.filter((t) => t.id !== oldId));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "welchfest",
          table: "truck_votes",
          filter: guestId ? `guest_id=eq.${guestId}` : undefined,
        },
        (payload) => {
          const v = payload.new as { band: Band; truck_id: string };
          setMyVotes((prev) =>
            prev[v.band] === v.truck_id ? prev : { ...prev, [v.band]: v.truck_id }
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bootstrapped, guestId, fetchAll]);

  const byBand = useMemo(() => {
    const map: Record<Band, Truck[]> = { new: [], mid: [], veteran: [] };
    for (const t of trucks) map[t.band].push(t);
    return map;
  }, [trucks]);

  async function castVote(truck: Truck) {
    if (!guestId || submitting) return;
    if (myVotes[truck.band]) return; // already voted in this band
    setSubmitting(truck.id);
    setError(null);

    // Optimistic update: mark vote and bump local count. Realtime will
    // reconcile for everyone else (and confirm for us).
    const prevVotes = myVotes;
    const prevTrucks = trucks;
    setMyVotes((prev) => ({ ...prev, [truck.band]: truck.id }));
    setTrucks((prev) =>
      prev.map((t) =>
        t.id === truck.id ? { ...t, vote_count: t.vote_count + 1 } : t
      )
    );

    const { error: insErr } = await supabase
      .from("truck_votes")
      .insert({ truck_id: truck.id, guest_id: guestId, band: truck.band });
    setSubmitting(null);
    if (insErr) {
      setMyVotes(prevVotes);
      setTrucks(prevTrucks);
      if (insErr.code === "23505") {
        setError("You've already voted in this class.");
        // Re-sync myVotes from DB so the UI shows the actual recorded vote.
        fetchAll();
      } else {
        setError(insErr.message);
      }
    }
  }

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto relative">
      <WBLetterhead subtitle="Best Truck" code="Form W/AWD" />

      <WBHint>
        Vote for your favourite truck in each class below. You get{" "}
        <strong>one vote per class</strong> and it&rsquo;s final, so choose well.
      </WBHint>

      <div style={{ flex: 1, paddingBottom: 64 }}>
        {bootstrapped && trucks.length === 0 && (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--color-faded)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              lineHeight: 1.6,
            }}
          >
            No trucks added yet.
            <br />
            <span style={{ fontSize: 11, opacity: 0.7 }}>
              Trucks appear here before judging.
            </span>
          </div>
        )}

        {BAND_ORDER.map((band) => (
          <BandSection
            key={band}
            band={band}
            trucks={byBand[band]}
            votedTruckId={myVotes[band]}
            submittingId={submitting}
            onVote={castVote}
          />
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="fixed inset-x-0 mx-auto max-w-md"
          style={{
            bottom: 60,
            margin: "0 14px",
            background: "var(--color-stamp)",
            color: "var(--color-paper)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "8px 12px",
            fontWeight: 700,
            boxShadow: "2px 2px 0 var(--color-ink)",
          }}
        >
          {error}
        </div>
      )}

      {/* Bottom nav (mirrors /songs and /feed) */}
      <div
        className="fixed bottom-0 inset-x-0 mx-auto max-w-md"
        style={{
          borderTop: "1.5px solid var(--color-ink)",
          background: "var(--color-card)",
          display: "flex",
          padding: "10px 14px",
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 15,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        <Link
          href="/feed"
          style={{ flex: 1, textAlign: "center", opacity: 0.55, color: "inherit" }}
        >
          Photos
        </Link>
        <Link
          href="/songs"
          style={{ flex: 1, textAlign: "center", opacity: 0.55, color: "inherit" }}
        >
          Songs
        </Link>
        <span style={{ flex: 1, textAlign: "center", fontWeight: 700 }}>
          <span
            style={{
              borderBottom: "2px solid var(--color-blue-deep)",
              paddingBottom: 2,
            }}
          >
            Awards
          </span>
        </span>
        <Link
          href="/designs"
          style={{ flex: 1, textAlign: "center", opacity: 0.55, color: "inherit" }}
        >
          Design
        </Link>
      </div>
    </main>
  );
}

function BandSection({
  band,
  trucks,
  votedTruckId,
  submittingId,
  onVote,
}: {
  band: Band;
  trucks: Truck[];
  votedTruckId: string | undefined;
  submittingId: string | null;
  onVote: (t: Truck) => void;
}) {
  const hasVoted = !!votedTruckId;
  return (
    <section style={{ borderTop: "1.5px solid var(--color-ink)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "10px 16px 6px",
          background: "var(--color-card)",
        }}
      >
        <WBLabel>{BAND_LABEL[band]}</WBLabel>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: hasVoted ? "var(--color-stamp)" : "var(--color-faded)",
            letterSpacing: "0.14em",
            fontWeight: 700,
          }}
        >
          {hasVoted ? "VOTE CAST" : trucks.length > 0 ? "CAST YOUR VOTE" : ""}
        </span>
      </div>

      {trucks.length === 0 ? (
        <div
          style={{
            padding: "18px 16px 22px",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--color-faded)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          No trucks in this class yet
        </div>
      ) : (
        trucks.map((t) => (
          <TruckRow
            key={t.id}
            truck={t}
            voted={votedTruckId === t.id}
            disabled={hasVoted}
            submitting={submittingId === t.id}
            onVote={() => onVote(t)}
          />
        ))
      )}
    </section>
  );
}

function TruckRow({
  truck,
  voted,
  disabled,
  submitting,
  onVote,
}: {
  truck: Truck;
  voted: boolean;
  disabled: boolean;
  submitting: boolean;
  onVote: () => void;
}) {
  const otherGreyed = disabled && !voted;
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "10px 14px",
        borderTop: "1px dashed rgba(30, 27, 22, 0.18)",
        opacity: otherGreyed ? 0.45 : 1,
        background: voted ? "var(--color-card)" : "transparent",
        position: "relative",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          flexShrink: 0,
          background: "var(--color-card-deep)",
          border: "1px solid rgba(30, 27, 22, 0.2)",
          overflow: "hidden",
          filter: otherGreyed ? "grayscale(1)" : "none",
        }}
      >
        {truck.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={truck.photo_url}
            alt=""
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--color-faded)",
              letterSpacing: "0.14em",
            }}
          >
            —
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {truck.display_name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--color-faded)",
            marginTop: 1,
          }}
        >
          {truck.driver_name} ·{" "}
          <span style={{ color: "var(--color-blue)" }}>{truck.depot}</span>{" "}
          · {truck.year}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 700,
            marginTop: 2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {truck.vote_count} VOTE{truck.vote_count === 1 ? "" : "S"}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {voted ? (
          <WBStamp rotate={-6}>Voted</WBStamp>
        ) : disabled ? (
          <span
            aria-hidden
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-faded)",
              letterSpacing: "0.14em",
            }}
          >
            ·
          </span>
        ) : (
          <button
            type="button"
            onClick={onVote}
            disabled={submitting}
            aria-label={`Vote for ${truck.display_name}`}
            style={{
              background: "var(--color-blue-deep)",
              color: "var(--color-paper)",
              border: "none",
              padding: "12px 18px",
              minHeight: 44,
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.18em",
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.6 : 1,
              boxShadow: "2px 2px 0 var(--color-ink)",
            }}
          >
            {submitting ? "…" : "VOTE"}
          </button>
        )}
      </div>
    </div>
  );
}
