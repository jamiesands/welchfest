"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WelchMark from "@/components/waybill/WelchMark";
import WBLabel from "@/components/waybill/WBLabel";
import WBHint from "@/components/waybill/WBHint";
import WBListStatus from "@/components/waybill/WBListStatus";
import EntryRow from "@/components/feed/EntryRow";
import PhotoModal from "@/components/feed/PhotoModal";
import UploadSheet from "@/components/feed/UploadSheet";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/net";
import { useRefetchOnResume } from "@/lib/useRefetchOnResume";
import type { PhotoWithGuest } from "@/lib/photos";

type Tab = "photo" | "360" | "mine";

const TABS: { id: Tab; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "360", label: "360°" },
  { id: "mine", label: "Mine" },
];

const PAGE_SIZE = 30;

const PHOTO_COLS =
  "id, unit_number, guest_id, storage_path, image_url, guest_name, depot, type, caption, status, created_at, moderated_at, guest:guests(name, depot)";

function baseQuery() {
  return supabase.from("photos").select(PHOTO_COLS).neq("status", "hidden");
}

function buildQuery(tab: Tab, guestId: string | null) {
  if (tab === "mine") {
    if (!guestId) return baseQuery().eq("id", "00000000-0000-0000-0000-000000000000");
    return baseQuery().eq("guest_id", guestId);
  }
  if (tab === "360") return baseQuery().eq("type", "360");
  return baseQuery().eq("type", "photo");
}

export default function FeedPage() {
  const router = useRouter();
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [depot, setDepot] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootError, setBootError] = useState(false);
  const [tab, setTab] = useState<Tab>("photo");
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">(
    "loading"
  );
  const [rows, setRows] = useState<PhotoWithGuest[]>([]);
  const [unitCount, setUnitCount] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [open, setOpen] = useState<PhotoWithGuest | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const oldestRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Guest bootstrap. maybeSingle() so a network failure is distinguishable
  // from an unknown guest — only the latter bounces to /join; a dead-signal
  // moment shows a retry instead of dumping a valid guest on the join form
  // (HARDENING-AUDIT.md C4).
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

  const refreshCount = useCallback(async () => {
    try {
      const { count } = await withTimeout(
        supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .neq("status", "hidden")
          .eq("type", "photo")
      );
      if (typeof count === "number") setUnitCount(count);
    } catch {
      // Header count is cosmetic — keep whatever we last had.
    }
  }, []);

  const loadInitial = useCallback(async () => {
    if (!bootstrapped) return;
    try {
      const { data, error } = await withTimeout(
        buildQuery(tab, guestId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE)
      );
      if (error || !data) throw error ?? new Error("load failed");
      const list = data as unknown as PhotoWithGuest[];
      setRows(list);
      oldestRef.current = list[list.length - 1]?.created_at ?? null;
      setHasMore(list.length === PAGE_SIZE);
      setFreshIds(new Set());
      setLoadState("ready");
    } catch {
      // Keep stale rows if we have them; only surface the error state when
      // there's nothing to show (HARDENING-AUDIT.md I1).
      setLoadState((s) => (s === "ready" ? s : "error"));
    }
  }, [bootstrapped, tab, guestId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitial();
    refreshCount();
  }, [loadInitial, refreshCount]);

  // Realtime: subscribe to inserts on welchfest.photos.
  useEffect(() => {
    if (!bootstrapped) return;
    const channel = supabase
      .channel("welchfest-photos-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "welchfest", table: "photos" },
        (payload) => {
          const incoming = payload.new as PhotoWithGuest;
          if (incoming.status === "hidden") return;
          if (tab === "photo" && incoming.type !== "photo") return;
          if (tab === "360" && incoming.type !== "360") return;
          if (tab === "mine" && incoming.guest_id !== guestId) return;
          setRows((prev) => {
            if (prev.some((p) => p.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
          setFreshIds((set) => {
            const next = new Set(set);
            next.add(incoming.id);
            return next;
          });
          if (incoming.type === "photo") {
            setUnitCount((c) => (c === null ? c : c + 1));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "welchfest", table: "photos" },
        (payload) => {
          const updated = payload.new as PhotoWithGuest;
          setRows((prev) => {
            if (updated.status === "hidden") {
              return prev.filter((p) => p.id !== updated.id);
            }
            return prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bootstrapped, tab, guestId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !oldestRef.current) return;
    setLoadingMore(true);
    try {
      const { data } = await withTimeout(
        buildQuery(tab, guestId)
          .lt("created_at", oldestRef.current)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE)
      );
      if (data) {
        const more = data as unknown as PhotoWithGuest[];
        if (more.length === 0) setHasMore(false);
        else {
          setRows((prev) => [...prev, ...more]);
          oldestRef.current = more[more.length - 1].created_at;
          if (more.length < PAGE_SIZE) setHasMore(false);
        }
      }
    } catch {
      // Sentinel stays mounted, so scrolling retries naturally.
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, tab, guestId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "200px" }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [loadMore]);

  // Catch up after the phone was locked / app backgrounded (C6); also
  // retries a failed bootstrap when connectivity returns.
  const onResume = useCallback(() => {
    if (!bootstrapped) {
      bootstrap();
      return;
    }
    loadInitial();
    refreshCount();
  }, [bootstrapped, bootstrap, loadInitial, refreshCount]);
  useRefetchOnResume(onResume);

  const displayCount = useMemo(
    () =>
      unitCount !== null
        ? String(unitCount).padStart(3, "0")
        : "—",
    [unitCount]
  );

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto relative">
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1.5px solid var(--color-ink)",
          background: "var(--color-card)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <WelchMark size={28} mode="real" />
        <div style={{ flex: 1 }}>
          <WBLabel>Party photos</WBLabel>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 21,
              lineHeight: 1,
              marginTop: 2,
            }}
          >
            Photo wall
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <WBLabel>Photos</WBLabel>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1,
              marginTop: 2,
              color: "var(--color-blue-deep)",
            }}
          >
            {displayCount}
          </div>
        </div>
      </div>

      <WBHint>
        The live photo wall. Tap <strong>+ Add Photo</strong> to post yours —
        everyone sees it straight away. Use the tabs to switch between photos,
        360° shots, and your own.
      </WBHint>

      <div
        role="tablist"
        style={{
          display: "flex",
          borderBottom: "1.5px solid var(--color-ink)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {TABS.map((t, i) => {
          const sel = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={sel}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "8px 0",
                background: sel ? "var(--color-ink)" : "transparent",
                color: sel ? "var(--color-paper)" : "var(--color-ink)",
                borderRight:
                  i < TABS.length - 1
                    ? "1.5px solid var(--color-ink)"
                    : "none",
                fontWeight: 600,
                fontFamily: "inherit",
                fontSize: "inherit",
                letterSpacing: "inherit",
                textTransform: "inherit",
                border: 0,
                borderBottom: 0,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, paddingBottom: 120 }}>
        {bootError && !bootstrapped ? (
          <WBListStatus state="error" empty={null} onRetry={bootstrap} />
        ) : rows.length === 0 ? (
          <WBListStatus
            state={
              !bootstrapped || loadState === "loading"
                ? "loading"
                : loadState === "error"
                  ? "error"
                  : "empty"
            }
            onRetry={loadInitial}
            empty={
              tab === "mine"
                ? "You haven't added any photos yet."
                : tab === "360"
                  ? <>360° photos appear here.<br /><span style={{ fontSize: 11, opacity: 0.7 }}>Taken on the special camera — coming through the night.</span></>
                  : "No photos yet. Add the first one."
            }
          />
        ) : (
          rows.map((p) => (
            <EntryRow
              key={p.id}
              photo={p}
              onOpen={() => setOpen(p)}
              isFresh={freshIds.has(p.id)}
            />
          ))
        )}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {loadingMore && (
          <div
            style={{
              padding: "16px",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--color-faded)",
              letterSpacing: "0.16em",
            }}
          >
            LOADING…
          </div>
        )}
      </div>

      <div
        className="fixed bottom-0 inset-x-0 mx-auto max-w-md"
        style={{
          borderTop: "1.5px solid var(--color-ink)",
          background: "var(--color-card)",
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1.5px solid var(--color-ink)",
          }}
        >
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            disabled={!bootstrapped}
            style={{
              width: "100%",
              background: "var(--color-blue-deep)",
              color: "var(--color-paper)",
              padding: "12px 16px",
              minHeight: 44,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.12em",
              boxShadow: "2px 2px 0 var(--color-ink)",
              border: 0,
              cursor: bootstrapped ? "pointer" : "not-allowed",
              opacity: bootstrapped ? 1 : 0.5,
            }}
          >
            + ADD PHOTO
          </button>
        </div>
        <div
          style={{
            display: "flex",
            padding: "10px 14px",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 15,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ flex: 1, textAlign: "center", fontWeight: 700 }}>
            <span
              style={{
                borderBottom: "2px solid var(--color-blue-deep)",
                paddingBottom: 2,
              }}
            >
              Photos
            </span>
          </span>
          <Link
            href="/songs"
            style={{ flex: 1, textAlign: "center", opacity: 0.55, color: "inherit" }}
          >
            Songs
          </Link>
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
      </div>

      {open && <PhotoModal photo={open} onClose={() => setOpen(null)} />}
      {uploadOpen && guestId && guestName && depot && (
        <UploadSheet
          guestId={guestId}
          guestName={guestName}
          depot={depot}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </main>
  );
}
