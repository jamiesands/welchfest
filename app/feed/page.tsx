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
import EntryRow from "@/components/feed/EntryRow";
import PhotoModal from "@/components/feed/PhotoModal";
import UploadSheet from "@/components/feed/UploadSheet";
import { supabase } from "@/lib/supabase";
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
  const [tab, setTab] = useState<Tab>("photo");
  const [rows, setRows] = useState<PhotoWithGuest[]>([]);
  const [unitCount, setUnitCount] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [open, setOpen] = useState<PhotoWithGuest | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const oldestRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const refreshCount = useCallback(async () => {
    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .neq("status", "hidden")
      .eq("type", "photo");
    if (typeof count === "number") setUnitCount(count);
  }, []);

  const loadInitial = useCallback(async () => {
    if (!bootstrapped) return;
    const { data, error } = await buildQuery(tab, guestId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (error || !data) return;
    const list = data as unknown as PhotoWithGuest[];
    setRows(list);
    oldestRef.current = list[list.length - 1]?.created_at ?? null;
    setHasMore(list.length === PAGE_SIZE);
    setFreshIds(new Set());
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
    const { data } = await buildQuery(tab, guestId)
      .lt("created_at", oldestRef.current)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (data) {
      const more = data as unknown as PhotoWithGuest[];
      if (more.length === 0) setHasMore(false);
      else {
        setRows((prev) => [...prev, ...more]);
        oldestRef.current = more[more.length - 1].created_at;
        if (more.length < PAGE_SIZE) setHasMore(false);
      }
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
          <WBLabel>Manifest in progress</WBLabel>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 18,
              lineHeight: 1,
              marginTop: 2,
            }}
          >
            Tonight&rsquo;s log
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <WBLabel>Units</WBLabel>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 22,
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
          fontSize: 10,
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

      <div style={{ flex: 1, minHeight: 0, paddingBottom: 64 }}>
        {rows.length === 0 && bootstrapped ? (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-faded)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              lineHeight: 1.6,
            }}
          >
            {tab === "mine"
              ? "You haven't logged anything yet."
              : tab === "360"
                ? <>360° spheres land here.<br /><span style={{ fontSize: 9, opacity: 0.7 }}>Logged from the depot rig — coming through the night.</span></>
                : "Manifest empty. Log the first unit."}
          </div>
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
              fontSize: 10,
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
          <span
            style={{
              fontWeight: 700,
              borderBottom: "2px solid var(--color-blue-deep)",
              paddingBottom: 2,
            }}
          >
            Manifest
          </span>
          <Link href="/songs" style={{ opacity: 0.55, color: "inherit" }}>
            Songs
          </Link>
          <Link href="/awards" style={{ opacity: 0.55, color: "inherit" }}>
            Awards
          </Link>
          <Link href="/designs" style={{ opacity: 0.55, color: "inherit" }}>
            Design
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          disabled={!bootstrapped}
          style={{
            background: "var(--color-blue-deep)",
            color: "var(--color-paper)",
            padding: "11px 14px",
            minHeight: 44,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            boxShadow: "2px 2px 0 var(--color-ink)",
            border: 0,
            cursor: bootstrapped ? "pointer" : "not-allowed",
            opacity: bootstrapped ? 1 : 0.5,
          }}
        >
          + ADD PHOTO
        </button>
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
