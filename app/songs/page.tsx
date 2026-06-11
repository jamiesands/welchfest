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
import WBHint from "@/components/waybill/WBHint";
import WBListStatus from "@/components/waybill/WBListStatus";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/net";
import { useRefetchOnResume } from "@/lib/useRefetchOnResume";
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
  const [bootError, setBootError] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">(
    "loading"
  );
  const [queue, setQueue] = useState<SongWithGuest[]>([]);
  const [played, setPlayed] = useState<SongWithGuest[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>("votes");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  // Guest bootstrap. maybeSingle() so a network failure is distinguishable
  // from an unknown guest — only the latter bounces to /join (C4).
  const bootstrap = useCallback(async () => {
    const id = localStorage.getItem("welchfest:guest_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    setBootError(false);
    try {
      const { data, error } = await withTimeout(
        supabase.from("guests").select("name, depot").eq("id", id).maybeSingle()
      );
      if (error) throw error;
      if (!data) {
        router.replace("/join");
        return;
      }
      setGuestId(id);
      setGuestName(data.name);
      setDepot(data.depot);
      setBootstrapped(true);
    } catch {
      setBootError(true);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    bootstrap();
  }, [bootstrap]);

  const fetchAll = useCallback(async () => {
    if (!guestId) return;
    try {
      const [activeRes, playedRes, votesRes] = await withTimeout(
        Promise.all([
          supabase
            .from("songs")
            .select(SONG_COLS)
            .in("status", ["queued", "cued"]),
          supabase
            .from("songs")
            .select(SONG_COLS)
            .in("status", DONE_STATUSES)
            .order("finished_playing_at", { ascending: false, nullsFirst: false })
            .limit(PLAYED_LIMIT),
          supabase.from("song_votes").select("song_id").eq("guest_id", guestId),
        ])
      );
      if (activeRes.error) throw activeRes.error;
      const rows = (activeRes.data ?? []) as unknown as SongWithGuest[];
      setQueue(sortQueue(rows));
      if (playedRes.data) {
        setPlayed(playedRes.data as unknown as SongWithGuest[]);
      }
      if (votesRes.data) {
        setMyVotes(new Set(votesRes.data.map((v) => v.song_id)));
      }
      setLoadState("ready");
    } catch {
      // Keep stale rows if we have them (I1).
      setLoadState((s) => (s === "ready" ? s : "error"));
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

  // Catch up after the phone was locked / app backgrounded (C6); also
  // retries a failed bootstrap when connectivity returns.
  const onResume = useCallback(() => {
    if (!bootstrapped) {
      bootstrap();
      return;
    }
    fetchAll();
  }, [bootstrapped, bootstrap, fetchAll]);
  useRefetchOnResume(onResume);

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
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("songs")
          .insert({
            guest_id: guestId,
            guest_name: guestName,
            depot,
            title: t,
            artist: a,
          })
          .select("id")
          .single()
      );
      if (error || !data) throw error ?? new Error("insert failed");
      // Self-vote is best-effort; the song row is already in.
      await withTimeout(
        supabase.from("song_votes").insert({ song_id: data.id, guest_id: guestId })
      ).catch(() => {});
      setTitle("");
      setArtist("");
      flash("Added to the queue.");
    } catch {
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
    // The DB is the source of truth (song_votes PK); on failure the
    // optimistic change must be rolled back or the count lies (I2).
    try {
      if (has) {
        const { error } = await withTimeout(
          supabase
            .from("song_votes")
            .delete()
            .eq("song_id", songId)
            .eq("guest_id", guestId)
        );
        if (error) throw error;
      } else {
        const { error } = await withTimeout(
          supabase
            .from("song_votes")
            .insert({ song_id: songId, guest_id: guestId })
        );
        // Duplicate key: this guest already voted (other tab/device) —
        // the optimistic "voted" state is correct, keep it.
        if (error && error.code !== "23505") throw error;
      }
    } catch {
      setMyVotes((prev) => {
        const next = new Set(prev);
        if (has) next.add(songId);
        else next.delete(songId);
        return next;
      });
      setQueue((prev) =>
        prev.map((s) =>
          s.id === songId
            ? { ...s, votes_count: s.votes_count + (has ? 1 : -1) }
            : s
        )
      );
      flash("Vote didn't go through — try again.");
    }
  }

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto relative">
      <WBLetterhead subtitle="Song Queue" code="Requests" />

      <WBHint>
        This is the song queue. Tap the <strong>↑</strong> arrow to vote a track
        up the list, or add your own at the bottom. The DJ plays whatever&rsquo;s
        nearest the top.
      </WBHint>

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
          <WBLabel>Up next</WBLabel>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
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
            fontSize: 11,
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
        {bootError && !bootstrapped ? (
          <WBListStatus state="error" empty={null} onRetry={bootstrap} />
        ) : displayQueue.length === 0 && played.length === 0 ? (
          <WBListStatus
            state={
              !bootstrapped || loadState === "loading"
                ? "loading"
                : loadState === "error"
                  ? "error"
                  : "empty"
            }
            onRetry={fetchAll}
            empty="Nothing in the queue. Be first."
          />
        ) : null}

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
            <WBLabel>Already played</WBLabel>
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
            padding: "12px 16px",
            minHeight: 44,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
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
        <span style={{ flex: 1, textAlign: "center", fontWeight: 700 }}>
          <span
            style={{
              borderBottom: "2px solid var(--color-blue-deep)",
              paddingBottom: 2,
            }}
          >
            Songs
          </span>
        </span>
        <Link
          href="/awards"
          style={{ flex: 1, textAlign: "center", opacity: 0.55, color: "inherit" }}
        >
          Awards
        </Link>
        <Link
          href="/designs"
          style={{ flex: 1, textAlign: "center", opacity: 0.55, color: "inherit" }}
        >
          Design
        </Link>
        <Link
          href="/whats-on"
          style={{ flex: 1, textAlign: "center", opacity: 0.55, color: "inherit" }}
        >
          Agenda
        </Link>
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
              fontSize: 12,
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
  fontSize: 13,
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
          fontSize: 19,
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
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {song.title}
          {yours && <Pill bg="var(--color-stamp)">YOURS</Pill>}
          {cued && <Pill bg="var(--color-blue-deep)">NEXT</Pill>}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
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
            fontSize: 15,
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
              width: 44,
              height: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 14,
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
              width: 44,
              height: 44,
              border: "1.5px solid var(--color-blue-deep)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 24,
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
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.2,
            textDecoration: "line-through",
          }}
        >
          {song.title}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
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
            Played
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
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
          fontSize: 13,
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
        fontSize: 10,
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

