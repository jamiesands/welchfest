"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import WelchMark from "@/components/waybill/WelchMark";
import { supabase } from "@/lib/supabase";
import { SONG_COLS, sortQueue, type SongWithGuest } from "@/lib/songs";

const POLL_MS = 3000;
const QUEUED_STATUSES = ["queued", "cued"] as const;

const DARK = {
  bg: "#0e1116",
  panel: "#161a22",
  inset: "#1a1f2a",
  text: "#e8e3d3",
  dim: "rgba(255,255,255,0.55)",
  rule: "rgba(255,255,255,0.1)",
};

export default function DjConsole() {
  const [playing, setPlaying] = useState<SongWithGuest | null>(null);
  const [queue, setQueue] = useState<SongWithGuest[]>([]);
  const [playedCount, setPlayedCount] = useState(0);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const errorTimer = useRef<number | null>(null);

  const fetchAll = useCallback(async () => {
    const [activeRes, playedRes] = await Promise.all([
      supabase
        .from("songs")
        .select(SONG_COLS)
        .in("status", [...QUEUED_STATUSES, "playing"]),
      supabase
        .from("songs")
        .select("id", { count: "exact", head: true })
        .eq("status", "played"),
    ]);
    if (activeRes.data) {
      const rows = activeRes.data as unknown as SongWithGuest[];
      setPlaying(rows.find((r) => r.status === "playing") ?? null);
      setQueue(sortQueue(rows.filter((r) => r.status !== "playing")));
    }
    if (typeof playedRes.count === "number") setPlayedCount(playedRes.count);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    function tick() {
      if (document.visibilityState !== "visible") return;
      fetchAll();
    }
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [fetchAll]);

  function flashError(msg: string) {
    setLastError(msg);
    if (errorTimer.current) window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setLastError(null), 3000);
  }

  async function call(
    path: "play-next" | "skip" | "block" | "cue",
    body?: Record<string, unknown>
  ) {
    setBusy(true);
    try {
      const res = await fetch(`/api/dj/${path}`, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        flashError(data.error ?? `${path} failed`);
      } else {
        await fetchAll();
      }
    } finally {
      setBusy(false);
    }
  }

  const filteredQueue = useMemo(() => {
    if (!filter.trim()) return queue;
    const f = filter.trim().toLowerCase();
    return queue.filter(
      (s) =>
        s.title.toLowerCase().includes(f) || s.artist.toLowerCase().includes(f)
    );
  }, [queue, filter]);

  const upNext = useMemo(() => {
    const cued = queue.find((s) => s.status === "cued");
    return cued ?? queue[0] ?? null;
  }, [queue]);

  const queuedCount = queue.length;

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: DARK.bg,
        color: DARK.text,
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 18px",
          borderBottom: `1px solid ${DARK.rule}`,
          background: DARK.panel,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <WelchMark size={28} color="#2275b3" />
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.22em",
              color: DARK.dim,
            }}
          >
            DJ CONSOLE · WF·26
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 17,
              marginTop: 2,
              lineHeight: 1,
            }}
          >
            Tonight&rsquo;s Loading Sheet
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 18,
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
          }}
        >
          <div>
            <span style={{ color: DARK.dim }}>QUEUED</span>{" "}
            <span
              style={{
                color: "#2275b3",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {queuedCount}
            </span>
          </div>
          <div>
            <span style={{ color: DARK.dim }}>PLAYED</span>{" "}
            <span style={{ fontWeight: 700, fontSize: 14 }}>{playedCount}</span>
          </div>
          <LiveDot />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 360px) 1fr",
          flex: 1,
          minHeight: 0,
        }}
        className="dj-grid"
      >
        {/* Now departing pane */}
        <section
          style={{
            padding: "16px 18px",
            borderRight: `1px solid ${DARK.rule}`,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minWidth: 0,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.22em",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              NOW DEPARTING
            </div>
            {playing ? (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 700,
                    fontSize: 22,
                    marginTop: 6,
                    lineHeight: 1.1,
                  }}
                >
                  {playing.title}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.6)",
                    marginTop: 2,
                  }}
                >
                  {playing.artist} · req. {playing.guest?.depot ?? "—"} ·{" "}
                  {playing.votes_count} votes
                </div>
              </>
            ) : (
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 22,
                  marginTop: 6,
                  lineHeight: 1.2,
                }}
              >
                Nothing on the decks.
              </div>
            )}
          </div>

          <Waveform active={!!playing} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            <DjButton
              tone="primary"
              onClick={() => call("skip")}
              disabled={busy || !playing}
            >
              SKIP
            </DjButton>
            <DjButton
              tone="neutral"
              onClick={() => call("cue")}
              disabled={busy}
            >
              CUE
            </DjButton>
            <DjButton
              tone="danger"
              onClick={() => call("block")}
              disabled={busy || !playing}
            >
              BLOCK
            </DjButton>
          </div>

          <DjButton
            tone="primary"
            big
            onClick={() => call("play-next")}
            disabled={busy || queue.length === 0}
          >
            PLAY NEXT →
          </DjButton>

          <div
            style={{
              marginTop: "auto",
              paddingTop: 10,
              borderTop: "1px dashed rgba(255,255,255,0.15)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "0.12em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            UP NEXT ·{" "}
            {upNext
              ? `${upNext.title.toUpperCase()} · ${upNext.artist.toUpperCase()}`
              : "QUEUE EMPTY"}
          </div>

          {lastError && (
            <div
              role="alert"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "#b8412a",
                border: "1.5px solid #b8412a",
                padding: "6px 10px",
                fontWeight: 700,
              }}
            >
              {lastError}
            </div>
          )}
        </section>

        {/* Queue pane */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              borderBottom: `1px solid ${DARK.rule}`,
              background: DARK.panel,
            }}
          >
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter queue…"
              aria-label="Filter queue"
              style={{
                flex: 1,
                background: DARK.inset,
                border: `1px solid ${DARK.rule}`,
                color: DARK.text,
                padding: "8px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.06em",
                outline: "none",
              }}
            />
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: DARK.dim,
                letterSpacing: "0.14em",
              }}
            >
              {filteredQueue.length}/{queue.length}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "30px 1fr 70px 60px 70px",
              padding: "8px 18px",
              borderBottom: `1px solid ${DARK.rule}`,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <span>#</span>
            <span>TRACK / ARTIST</span>
            <span>DEPOT</span>
            <span>VOTES</span>
            <span>ACTION</span>
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
            {filteredQueue.length === 0 && (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: DARK.dim,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                {queue.length === 0
                  ? "Loading sheet empty."
                  : "No matches."}
              </div>
            )}
            {filteredQueue.map((s, i) => {
              const isCued = s.status === "cued";
              return (
                <div
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "30px 1fr 70px 60px 70px",
                    alignItems: "center",
                    padding: "10px 18px",
                    background: isCued ? DARK.inset : "transparent",
                    borderBottom: "1px dashed rgba(255,255,255,0.08)",
                    borderLeft: isCued
                      ? "3px solid #2275b3"
                      : "3px solid transparent",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: isCued ? "#2275b3" : "rgba(255,255,255,0.65)",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.title}
                      {isCued && (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            marginLeft: 8,
                            color: "#2275b3",
                            letterSpacing: "0.14em",
                            fontWeight: 700,
                          }}
                        >
                          ▶ CUED
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "rgba(255,255,255,0.55)",
                        marginTop: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.artist}
                    </div>
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "#2275b3",
                      fontWeight: 700,
                    }}
                  >
                    {s.guest?.depot ?? "—"}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s.votes_count}
                  </span>
                  <span style={{ display: "flex", gap: 6 }}>
                    {!isCued && (
                      <button
                        type="button"
                        onClick={() => call("cue", { song_id: s.id })}
                        disabled={busy}
                        title="Cue"
                        style={miniBtn("neutral", busy)}
                      >
                        CUE
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => call("block", { song_id: s.id })}
                      disabled={busy}
                      title="Block"
                      style={miniBtn("danger", busy)}
                    >
                      ✕
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 720px) {
          :global(.dj-grid) {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto 1fr;
          }
        }
      `}</style>
    </main>
  );
}

function LiveDot() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#b8412a",
          boxShadow: "0 0 8px #b8412a",
          animation: "djlive 1.2s ease-in-out infinite",
          display: "inline-block",
        }}
      />
      <span style={{ color: "#b8412a", fontWeight: 700 }}>LIVE</span>
      <style jsx>{`
        @keyframes djlive {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }
      `}</style>
    </span>
  );
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        height: 90,
        background: "#1a1f2a",
        borderRadius: 4,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 280 90"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 80 }).map((_, i) => {
          const h = 8 + Math.abs(Math.sin(i * 0.6) * 26) + (i % 7) * 2;
          const lit = active && i < 24;
          return (
            <rect
              key={i}
              x={i * 3.5}
              y={(90 - h) / 2}
              width="2"
              height={h}
              fill={lit ? "#2275b3" : "rgba(255,255,255,0.35)"}
            />
          );
        })}
      </svg>
      {active && (
        <div
          style={{
            position: "absolute",
            left: "30%",
            top: 0,
            bottom: 0,
            width: 2,
            background: "#efe8d4",
          }}
        />
      )}
    </div>
  );
}

type Tone = "primary" | "neutral" | "danger";

function DjButton({
  tone,
  children,
  onClick,
  disabled,
  big,
}: {
  tone: Tone;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  big?: boolean;
}) {
  const styles: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: big ? 13 : 11,
    letterSpacing: "0.14em",
    fontWeight: 700,
    padding: big ? "14px 0" : "10px 0",
    textAlign: "center",
    borderRadius: 3,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "transform 80ms ease",
    border: "none",
    color: "#e8e3d3",
  };
  if (tone === "primary") {
    styles.background = "#164b75";
  } else if (tone === "neutral") {
    styles.background = "#1a1f2a";
    styles.border = "1px solid rgba(255,255,255,0.15)";
  } else {
    styles.background = "transparent";
    styles.color = "#b8412a";
    styles.border = "1.5px solid #b8412a";
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={styles}>
      {children}
    </button>
  );
}

function miniBtn(tone: Tone, busy: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: "0.12em",
    fontWeight: 700,
    padding: "4px 8px",
    cursor: busy ? "wait" : "pointer",
    opacity: busy ? 0.5 : 1,
  };
  if (tone === "primary") {
    return { ...base, background: "#164b75", color: "#e8e3d3", border: "none" };
  }
  if (tone === "neutral") {
    return {
      ...base,
      background: "transparent",
      color: "#e8e3d3",
      border: "1px solid rgba(255,255,255,0.3)",
    };
  }
  return {
    ...base,
    background: "transparent",
    color: "#b8412a",
    border: "1.5px solid #b8412a",
  };
}
