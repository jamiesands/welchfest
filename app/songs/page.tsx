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
  DONE_STATUSES,
  SONG_COLS,
  songDepot,
  songGuestName,
  sortQueue,
  type SongWithGuest,
} from "@/lib/songs";

const PLAYED_LIMIT = 10;

type Sort = "votes" | "new";

export default function SongsPage() {
  const router = useRouter();
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [depot, setDepot] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<SongWithGuest | null>(null);
  const [queue, setQueue] = useState<SongWithGuest[]>([]);
  const [played, setPlayed] = useState<SongWithGuest[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>("votes");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

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
        .select("name, depot")
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (!data) {
        router.replace("/join");
        return;
      }
      setGuestId(id);
      setGuestName(data.name);
      setDepot(data.depot);
      setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const fetchAll = useCallback(async () => {
    if (!guestId) return;
    const [activeRes, playedRes, votesRes] = await Promise.all([
      supabase
        .from("songs")
        .select(SONG_COLS)
        .in("status", ["queued", "cued", "playing"]),
      supabase
        .from("songs")
        .select(SONG_COLS)
        .in("status", DONE_STATUSES)
        .order("finished_playing_at", { ascending: false, nullsFirst: false })
        .limit(PLAYED_LIMIT),
      supabase.from("song_votes").select("song_id").eq("guest_id", guestId),
    ]);
    if (activeRes.data) {
      const rows = activeRes.data as unknown as SongWithGuest[];
      const playing = rows.find((r) => r.status === "playing") ?? null;
      const queueRows = sortQueue(rows.filter((r) => r.status !== "playing"));
      setNowPlaying(playing);
      setQueue(queueRows);
    }
    if (playedRes.data) {
      setPlayed(playedRes.data as unknown as SongWithGuest[]);
    }
    if (votesRes.data) {
      setMyVotes(new Set(votesRes.data.map((v) => v.song_id)));
    }
  }, [guestId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  // Realtime: any change on songs or song_votes refreshes the lists. The
  // trigger keeps songs.votes_count in sync, so the UPDATE event carries
  // the latest count; we just need to re-sort and re-bucket.
  useEffect(() => {
    if (!bootstrapped) return;
    const channel = supabase
      .channel("welchfest-songs-guest")
      .on(
        "postgres_changes",
        { event: "*", schema: "welchfest", table: "songs" },
        () => {
          fetchAll();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "welchfest",
          table: "song_votes",
          filter: guestId ? `guest_id=eq.${guestId}` : undefined,
        },
        (payload) => {
          // Keep my-votes set in sync if another device of mine voted.
          if (payload.eventType === "INSERT") {
            const songId = (payload.new as { song_id: string }).song_id;
            setMyVotes((prev) => {
              if (prev.has(songId)) return prev;
              const next = new Set(prev);
              next.add(songId);
              return next;
            });
          } else if (payload.eventType === "DELETE") {
            const songId = (payload.old as { song_id: string }).song_id;
            setMyVotes((prev) => {
              if (!prev.has(songId)) return prev;
              const next = new Set(prev);
              next.delete(songId);
              return next;
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bootstrapped, fetchAll, guestId]);

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
    if (!guestId || !guestName || !depot || submitting) return;
    const t = title.trim();
    const a = artist.trim();
    if (!t) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("songs")
      .insert({
        guest_id: guestId,
        guest_name: guestName,
        depot,
        title: t,
        artist: a,
      })
      .select("id")
      .single();
    if (!error && data) {
      await supabase
        .from("song_votes")
        .insert({ song_id: data.id, guest_id: guestId });
      setTitle("");
      setArtist("");
      flash("On the loading sheet.");
    } else {
      flash("Couldn't add — try again.");
    }
    setSubmitting(false);
  }

  async function toggleVote(songId: string) {
    if (!guestId) return;
    const has = myVotes.has(songId);
    // Optimistic local update — the trigger + realtime UPDATE will
    // reconcile votes_count for everyone else.
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

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto relative">
      <WBLetterhead subtitle="Loading Sheet" code="Cargo of the night" />

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
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: 130 }}>
        {displayQueue.length === 0 && played.length === 0 && (
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
            <QueueRow
              key={s.id}
              song={s}
              index={i}
              voted={voted}
              yours={yours}
              cued={isCued}
              onVote={() => toggleVote(s.id)}
            />
          );
        })}

        {played.length > 0 && (
          <div
            style={{
              borderTop: "1.5px solid var(--color-ink)",
              background: "var(--color-card-deep)",
              padding: "8px 16px 4px",
            }}
          >
            <WBLabel>Departed</WBLabel>
          </div>
        )}
        {played.map((s) => (
          <DepartedRow key={s.id} song={s} />
        ))}
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
          style={inputStyle}
        />
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist (optional)"
          aria-label="Artist"
          maxLength={120}
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={!title.trim() || submitting}
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
            opacity: title.trim() && !submitting ? 1 : 0.55,
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

const inputStyle: React.CSSProperties = {
  border: "1.5px solid var(--color-ink)",
  background: "var(--color-paper)",
  padding: "8px 10px",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--color-ink)",
  outline: "none",
  letterSpacing: "0.04em",
};

function QueueRow({
  song,
  index,
  voted,
  yours,
  cued,
  onVote,
}: {
  song: SongWithGuest;
  index: number;
  voted: boolean;
  yours: boolean;
  cued: boolean;
  onVote: () => void;
}) {
  const name = songGuestName(song);
  const dep = songDepot(song);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 14px",
        borderBottom: "1px dashed rgba(30, 27, 22, 0.2)",
        gap: 10,
        background: cued ? "var(--color-card)" : "transparent",
      }}
    >
      <div
        style={{
          width: 26,
          flexShrink: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 16,
          fontWeight: 700,
          color: index === 0 ? "var(--color-blue-deep)" : "var(--color-ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(index + 1).padStart(2, "0")}
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
          {song.title}
          {yours && <Pill bg="var(--color-stamp)">YOURS</Pill>}
          {cued && <Pill bg="var(--color-blue-deep)">CUED</Pill>}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-faded)",
            marginTop: 1,
          }}
        >
          {song.artist || "—"} · req. {name} ·{" "}
          <span style={{ color: "var(--color-blue)" }}>{dep}</span>
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
          {song.votes_count}
        </div>
        {yours ? (
          <span
            aria-hidden
            style={{
              width: 24,
              height: 24,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--color-faded)",
            }}
          >
            ·
          </span>
        ) : (
          <button
            type="button"
            onClick={onVote}
            disabled={voted}
            aria-label={voted ? "Voted" : "Upvote"}
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
              background: voted ? "var(--color-blue-deep)" : "transparent",
              color: voted ? "var(--color-paper)" : "var(--color-blue-deep)",
              cursor: voted ? "default" : "pointer",
              padding: 0,
              lineHeight: 1,
              opacity: voted ? 0.85 : 1,
            }}
          >
            ↑
          </button>
        )}
      </div>
    </div>
  );
}

function DepartedRow({ song }: { song: SongWithGuest }) {
  const name = songGuestName(song);
  const dep = songDepot(song);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 14px",
        borderBottom: "1px dashed rgba(30, 27, 22, 0.18)",
        gap: 10,
        opacity: 0.55,
        background: "var(--color-card-deep)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12.5,
            fontWeight: 600,
            lineHeight: 1.2,
            textDecoration: "line-through",
          }}
        >
          {song.title}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8.5,
              padding: "1px 4px",
              marginLeft: 6,
              border: "1.5px solid var(--color-ink)",
              color: "var(--color-ink)",
              letterSpacing: "0.14em",
              fontWeight: 700,
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Departed
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-faded)",
            marginTop: 1,
          }}
        >
          {song.artist || "—"} · req. {name} ·{" "}
          <span style={{ color: "var(--color-blue)" }}>{dep}</span>
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--color-faded)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {song.votes_count}
      </div>
    </div>
  );
}

function Pill({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 8.5,
        padding: "1px 4px",
        marginLeft: 6,
        background: bg,
        color: "var(--color-paper)",
        letterSpacing: "0.12em",
        fontWeight: 700,
      }}
    >
      {children}
    </span>
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
                {song.artist || "—"} · req. {songGuestName(song)} ·{" "}
                {songDepot(song)}
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

