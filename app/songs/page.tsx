"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";
import { supabase } from "@/lib/supabase";
import {
  SONG_COLS,
  sortQueue,
  type SongStatus,
  type SongWithGuest,
} from "@/lib/songs";

const POLL_MS = 5000;

type Sort = "votes" | "new";

export default function SongsPage() {
  const router = useRouter();
  const [guestId, setGuestId] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<SongWithGuest | null>(null);
  const [queue, setQueue] = useState<SongWithGuest[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>("votes");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showPlayed, setShowPlayed] = useState(false);
  const [played, setPlayed] = useState<SongWithGuest[]>([]);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("welchfest:guest_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuestId(id);
    setBootstrapped(true);
  }, [router]);

  const fetchAll = useCallback(async () => {
    if (!guestId) return;
    const [activeRes, votesRes] = await Promise.all([
      supabase
        .from("songs")
        .select(SONG_COLS)
        .in("status", ["queued", "cued", "playing"]),
      supabase.from("song_votes").select("song_id").eq("guest_id", guestId),
    ]);
    if (activeRes.data) {
      const rows = activeRes.data as unknown as SongWithGuest[];
      const playing = rows.find((r) => r.status === "playing") ?? null;
      const queueRows = sortQueue(rows.filter((r) => r.status !== "playing"));
      setNowPlaying(playing);
      setQueue(queueRows);
    }
    if (votesRes.data) {
      setMyVotes(new Set(votesRes.data.map((v) => v.song_id)));
    }
  }, [guestId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!bootstrapped) return;
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
  }, [bootstrapped, fetchAll]);

  const displayQueue = useMemo(() => {
    if (sort === "new") {
      return [...queue].sort((a, b) =>
        b.requested_at.localeCompare(a.requested_at)
      );
    }
    return queue;
  }, [queue, sort]);

  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!guestId || submitting) return;
    const t = title.trim();
    const a = artist.trim();
    if (!t || !a) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("songs")
      .insert({ guest_id: guestId, title: t, artist: a })
      .select("id")
      .single();
    if (!error && data) {
      await supabase
        .from("song_votes")
        .insert({ song_id: data.id, guest_id: guestId });
      setTitle("");
      setArtist("");
      flash("On the loading sheet.");
      await fetchAll();
    } else {
      flash("Couldn't add — try again.");
    }
    setSubmitting(false);
  }

  async function toggleVote(songId: string) {
    if (!guestId) return;
    const has = myVotes.has(songId);
    setMyVotes((prev) => {
      const next = new Set(prev);
      if (has) next.delete(songId);
      else next.add(songId);
      return next;
    });
    setQueue((prev) =>
      prev.map((s) =>
        s.id === songId
          ? { ...s, votes_count: s.votes_count + (has ? -1 : 1) }
          : s
      )
    );
    if (has) {
      await supabase
        .from("song_votes")
        .delete()
        .eq("song_id", songId)
        .eq("guest_id", guestId);
    } else {
      await supabase
        .from("song_votes")
        .insert({ song_id: songId, guest_id: guestId });
    }
  }

  async function loadPlayed() {
    const next = !showPlayed;
    setShowPlayed(next);
    if (next && played.length === 0) {
      const { data } = await supabase
        .from("songs")
        .select(SONG_COLS)
        .eq("status", "played" satisfies SongStatus)
        .order("finished_playing_at", { ascending: false })
        .limit(10);
      if (data) setPlayed(data as unknown as SongWithGuest[]);
    }
  }

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto relative">
      <WBLetterhead subtitle="Loading Sheet" code="Cargo of the night" />

      {/* Now departing */}
      <NowDeparting song={nowPlaying} />

      {/* Queue header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: "1.5px solid var(--color-ink)",
        }}
      >
        <div>
          <WBLabel>Queue · in line</WBLabel>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            By {sort === "votes" ? "votes ↓" : "new ↓"}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.12em",
          }}
        >
          <SortPill active={sort === "votes"} onClick={() => setSort("votes")}>
            VOTES
          </SortPill>
          <SortPill active={sort === "new"} onClick={() => setSort("new")}>
            NEW
          </SortPill>
          <button
            type="button"
            onClick={loadPlayed}
            style={{
              padding: "3px 7px",
              border: "1px solid var(--color-ink)",
              background: showPlayed ? "var(--color-ink)" : "transparent",
              color: showPlayed ? "var(--color-paper)" : "var(--color-ink)",
              fontFamily: "inherit",
              fontSize: "inherit",
              letterSpacing: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            PLAYED
          </button>
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: 130 }}>
        {showPlayed && (
          <div
            style={{
              background: "var(--color-card-deep)",
              borderBottom: "1.5px solid var(--color-ink)",
              padding: "8px 14px",
            }}
          >
            <WBLabel>Last played</WBLabel>
            {played.length === 0 && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-faded)",
                  letterSpacing: "0.12em",
                  marginTop: 6,
                }}
              >
                NOTHING YET.
              </div>
            )}
            <ul
              style={{
                listStyle: "none",
                margin: "6px 0 0",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {played.map((p) => (
                <li
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                  }}
                >
                  <span>
                    <strong>{p.title}</strong>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--color-faded)",
                        marginLeft: 6,
                      }}
                    >
                      {p.artist}
                    </span>
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--color-blue)",
                    }}
                  >
                    {p.guest?.depot ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {displayQueue.length === 0 && (
          <div
            style={{
              padding: "30px 24px",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-faded)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Nothing in the queue. Be first.
          </div>
        )}

        {displayQueue.map((s, i) => {
          const yours = !!guestId && s.guest_id === guestId;
          const voted = myVotes.has(s.id);
          const isCued = s.status === "cued";
          return (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 14px",
                borderBottom: "1px dashed rgba(30, 27, 22, 0.2)",
                gap: 10,
                background: isCued ? "var(--color-card)" : "transparent",
              }}
            >
              <div
                style={{
                  width: 26,
                  flexShrink: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 16,
                  fontWeight: 700,
                  color:
                    i === 0 ? "var(--color-blue-deep)" : "var(--color-ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {s.title}
                  {yours && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 8.5,
                        padding: "1px 4px",
                        marginLeft: 6,
                        background: "var(--color-stamp)",
                        color: "var(--color-paper)",
                        letterSpacing: "0.12em",
                        fontWeight: 700,
                      }}
                    >
                      YOURS
                    </span>
                  )}
                  {isCued && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 8.5,
                        padding: "1px 4px",
                        marginLeft: 6,
                        background: "var(--color-blue-deep)",
                        color: "var(--color-paper)",
                        letterSpacing: "0.12em",
                        fontWeight: 700,
                      }}
                    >
                      CUED
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--color-faded)",
                    marginTop: 1,
                  }}
                >
                  {s.artist} · req. {s.guest?.depot ?? "—"}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 18,
                    textAlign: "right",
                  }}
                >
                  {s.votes_count}
                </div>
                <button
                  type="button"
                  onClick={() => toggleVote(s.id)}
                  aria-label={voted ? "Remove vote" : "Upvote"}
                  aria-pressed={voted}
                  style={{
                    width: 24,
                    height: 24,
                    border: "1.5px solid var(--color-blue-deep)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    fontWeight: 700,
                    background: voted
                      ? "var(--color-blue-deep)"
                      : "transparent",
                    color: voted
                      ? "var(--color-paper)"
                      : "var(--color-blue-deep)",
                    cursor: "pointer",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ↑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Request bar */}
      <form
        onSubmit={onSubmit}
        className="fixed bottom-[44px] inset-x-0 mx-auto max-w-md"
        style={{
          borderTop: "1.5px solid var(--color-ink)",
          background: "var(--color-card)",
          padding: "10px 14px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
          gap: 8,
          alignItems: "stretch",
        }}
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Track title"
          aria-label="Track title"
          maxLength={120}
          style={{
            border: "1.5px solid var(--color-ink)",
            background: "var(--color-paper)",
            padding: "8px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-ink)",
            outline: "none",
            letterSpacing: "0.04em",
          }}
        />
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist"
          aria-label="Artist"
          maxLength={120}
          style={{
            border: "1.5px solid var(--color-ink)",
            background: "var(--color-paper)",
            padding: "8px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-ink)",
            outline: "none",
            letterSpacing: "0.04em",
          }}
        />
        <button
          type="submit"
          disabled={!title.trim() || !artist.trim() || submitting}
          style={{
            background: "var(--color-blue-deep)",
            color: "var(--color-paper)",
            padding: "8px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            boxShadow: "2px 2px 0 var(--color-ink)",
            border: "none",
            cursor: "pointer",
            opacity:
              title.trim() && artist.trim() && !submitting ? 1 : 0.55,
          }}
        >
          + ADD
        </button>
      </form>

      {/* Bottom nav */}
      <div
        className="fixed bottom-0 inset-x-0 mx-auto max-w-md"
        style={{
          borderTop: "1.5px solid var(--color-ink)",
          background: "var(--color-card)",
          display: "flex",
          padding: "10px 14px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 18,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <Link href="/feed" style={{ opacity: 0.55, color: "inherit" }}>
            Manifest
          </Link>
          <span
            style={{
              fontWeight: 700,
              borderBottom: "2px solid var(--color-blue-deep)",
              paddingBottom: 2,
            }}
          >
            Songs
          </span>
          <Link href="/awards" style={{ opacity: 0.55, color: "inherit" }}>
            Awards
          </Link>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--color-faded)",
            letterSpacing: "0.12em",
          }}
        >
          FORM W/SNG
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-0 mx-auto max-w-md"
          style={{
            bottom: 110,
            padding: "8px 14px",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: "var(--color-ink)",
              color: "var(--color-paper)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              padding: "6px 12px",
              letterSpacing: "0.14em",
              fontWeight: 700,
              boxShadow: "2px 2px 0 var(--color-blue-deep)",
            }}
          >
            {toast}
          </span>
        </div>
      )}
    </main>
  );
}

function SortPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "3px 7px",
        border: "1px solid var(--color-ink)",
        background: active ? "var(--color-ink)" : "transparent",
        color: active ? "var(--color-paper)" : "var(--color-ink)",
        fontFamily: "inherit",
        fontSize: "inherit",
        letterSpacing: "inherit",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function NowDeparting({ song }: { song: SongWithGuest | null }) {
  return (
    <div
      style={{
        background: "var(--color-blue-deep)",
        color: "var(--color-paper)",
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            borderRadius: 2,
            background: "var(--color-blue)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 4,
              background:
                "repeating-linear-gradient(135deg, var(--color-blue-deep) 0 3px, transparent 3px 6px)",
            }}
          />
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--color-paper)",
              zIndex: 1,
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(239,232,212,0.6)",
              fontWeight: 600,
            }}
          >
            Now departing
          </div>
          {song ? (
            <>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 700,
                  marginTop: 2,
                  lineHeight: 1.2,
                }}
              >
                {song.title}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  opacity: 0.75,
                  marginTop: 1,
                }}
              >
                {song.artist} · req. {song.guest?.depot ?? "—"}
              </div>
            </>
          ) : (
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 700,
                marginTop: 2,
                lineHeight: 1.2,
              }}
            >
              Awaiting first cargo.
            </div>
          )}
        </div>
        {song && (
          <div
            aria-hidden
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            ♪♪
          </div>
        )}
      </div>
      <div
        aria-hidden
        style={{
          marginTop: 10,
          height: 2,
          background: "rgba(255,255,255,0.18)",
        }}
      >
        <div
          style={{
            width: song ? "30%" : "0%",
            height: "100%",
            background: "var(--color-paper)",
          }}
        />
      </div>
    </div>
  );
}
