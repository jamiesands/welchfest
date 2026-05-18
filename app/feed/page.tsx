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
import EntryRow from "@/components/feed/EntryRow";
import PhotoModal from "@/components/feed/PhotoModal";
import { supabase } from "@/lib/supabase";
import type { PhotoWithGuest } from "@/lib/photos";

type Tab = "all" | "photo" | "360" | "mine";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "photo", label: "Photo" },
  { id: "360", label: "360°" },
  { id: "mine", label: "Mine" },
];

const PAGE_SIZE = 30;
const POLL_MS = 8000;

const PHOTO_COLS =
  "id, unit_number, guest_id, storage_path, type, caption, status, created_at, moderated_at, guest:guests(name, depot)";

function buildQuery(tab: Tab, guestId: string | null) {
  const base = supabase.from("photos").select(PHOTO_COLS);
  if (tab === "mine") {
    if (!guestId) return base.eq("id", "00000000-0000-0000-0000-000000000000");
    return base.eq("guest_id", guestId).in("status", ["pending", "approved"]);
  }
  if (tab === "photo") return base.eq("status", "approved").eq("type", "photo");
  if (tab === "360") return base.eq("status", "approved").eq("type", "360");
  return base.eq("status", "approved");
}

export default function FeedPage() {
  const router = useRouter();
  const [guestId, setGuestId] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [rows, setRows] = useState<PhotoWithGuest[]>([]);
  const [unitCount, setUnitCount] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [open, setOpen] = useState<PhotoWithGuest | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const newestRef = useRef<string | null>(null);
  const oldestRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("welchfest:guest_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    setGuestId(id);
    setBootstrapped(true);
  }, [router]);

  const refreshCount = useCallback(async () => {
    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");
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
    newestRef.current = list[0]?.created_at ?? null;
    oldestRef.current = list[list.length - 1]?.created_at ?? null;
    setHasMore(list.length === PAGE_SIZE);
    setFreshIds(new Set());
  }, [bootstrapped, tab, guestId]);

  useEffect(() => {
    loadInitial();
    refreshCount();
  }, [loadInitial, refreshCount]);

  // Polling — only when tab visible.
  useEffect(() => {
    if (!bootstrapped) return;
    let cancelled = false;
    async function poll() {
      if (cancelled || document.visibilityState !== "visible") return;
      if (newestRef.current) {
        const { data } = await buildQuery(tab, guestId)
          .gt("created_at", newestRef.current)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        if (data && data.length > 0) {
          const fresh = data as unknown as PhotoWithGuest[];
          setRows((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            const dedup = fresh.filter((p) => !existing.has(p.id));
            if (dedup.length === 0) return prev;
            newestRef.current = dedup[0].created_at;
            setFreshIds((set) => {
              const next = new Set(set);
              for (const p of dedup) next.add(p.id);
              return next;
            });
            return [...dedup, ...prev];
          });
        }
      }
      refreshCount();
    }
    const id = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [bootstrapped, tab, guestId, refreshCount]);

  // Infinite scroll.
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
      {/* Top bar */}
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
        <WelchMark size={28} color="#2275b3" />
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

      {/* Tabs */}
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

      {/* Rows */}
      <div style={{ flex: 1, minHeight: 0, paddingBottom: 64 }}>
        {rows.length === 0 && bootstrapped && (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-faded)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {tab === "mine"
              ? "You haven't logged anything yet."
              : "Manifest empty. Log the first unit."}
          </div>
        )}
        {rows.map((p) => (
          <EntryRow
            key={p.id}
            photo={p}
            onOpen={() => setOpen(p)}
            isFresh={freshIds.has(p.id)}
          />
        ))}
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

      {/* Bottom bar */}
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
        </div>
        <Link
          href="/upload"
          style={{
            background: "var(--color-blue-deep)",
            color: "var(--color-paper)",
            padding: "8px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            boxShadow: "2px 2px 0 var(--color-ink)",
            textDecoration: "none",
          }}
        >
          + LOG
        </Link>
      </div>

      {open && <PhotoModal photo={open} onClose={() => setOpen(null)} />}
    </main>
  );
}
