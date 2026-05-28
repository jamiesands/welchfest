"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";
import WBStamp from "@/components/waybill/WBStamp";
import { supabase } from "@/lib/supabase";
import {
  BAND_LABEL,
  BAND_ORDER,
  TRUCK_COLS,
  type Band,
  type Truck,
} from "@/lib/trucks";

export default function ResultsPage() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastLoaded, setLastLoaded] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trucks")
      .select(TRUCK_COLS)
      .order("vote_count", { ascending: false })
      .order("display_name", { ascending: true });
    if (data) setTrucks(data as unknown as Truck[]);
    setLastLoaded(new Date().toLocaleTimeString("en-GB"));
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  const byBand = useMemo(() => {
    const map: Record<Band, Truck[]> = { new: [], mid: [], veteran: [] };
    for (const t of trucks) map[t.band].push(t);
    return map;
  }, [trucks]);

  return (
    <main
      className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-2xl mx-auto"
    >
      <WBLetterhead subtitle="Final Manifest" code="Form W/AWD-RES" />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 18px",
          borderBottom: "1.5px solid var(--color-ink)",
          background: "var(--color-card)",
        }}
      >
        <div>
          <WBLabel>Best Truck · Final tally</WBLabel>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--color-faded)",
              letterSpacing: "0.14em",
              marginTop: 2,
            }}
          >
            {lastLoaded ? `LOADED ${lastLoaded}` : "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={fetchAll}
          disabled={loading}
          style={{
            background: "var(--color-blue-deep)",
            color: "var(--color-paper)",
            border: "none",
            padding: "8px 14px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "…" : "REFRESH"}
        </button>
      </div>

      <div style={{ padding: "10px 0 32px" }}>
        {BAND_ORDER.map((band) => (
          <BandResults key={band} band={band} trucks={byBand[band]} />
        ))}
      </div>
    </main>
  );
}

function BandResults({ band, trucks }: { band: Band; trucks: Truck[] }) {
  const winner = trucks[0] ?? null;
  const winnerHasVotes = winner && winner.vote_count > 0;
  return (
    <section
      style={{
        padding: "16px 18px",
        borderBottom: "1.5px solid var(--color-ink)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.28em",
            fontWeight: 700,
            color: "var(--color-ink)",
          }}
        >
          {BAND_LABEL[band]}
        </div>
        {winnerHasVotes && <WBStamp rotate={-4}>Winner</WBStamp>}
      </div>

      {trucks.length === 0 ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-faded)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          No entries in this class
        </div>
      ) : (
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            border: "1.5px solid var(--color-ink)",
            background: "var(--color-card)",
          }}
        >
          {trucks.map((t, i) => {
            const isWinner = winnerHasVotes && t.id === winner.id;
            return (
              <li
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderBottom:
                    i < trucks.length - 1
                      ? "1px dashed rgba(30,27,22,0.27)"
                      : "none",
                  background: isWinner ? "var(--color-paper)" : "transparent",
                }}
              >
                <div
                  style={{
                    width: 28,
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    fontWeight: 700,
                    color: isWinner
                      ? "var(--color-blue-deep)"
                      : "var(--color-faded)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    flexShrink: 0,
                    background: "var(--color-card-deep)",
                    border: "1px solid rgba(30,27,22,0.2)",
                    overflow: "hidden",
                  }}
                >
                  {t.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.photo_url}
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
                        fontSize: 10,
                        color: "var(--color-faded)",
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
                      fontSize: 15,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {t.display_name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--color-faded)",
                      marginTop: 1,
                    }}
                  >
                    {t.driver_name} ·{" "}
                    <span style={{ color: "var(--color-blue)" }}>
                      {t.depot}
                    </span>{" "}
                    · {t.year}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: isWinner
                      ? "var(--color-blue-deep)"
                      : "var(--color-ink)",
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 36,
                    textAlign: "right",
                  }}
                >
                  {t.vote_count}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
