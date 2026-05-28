"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import WelchMark from "@/components/waybill/WelchMark";
import { supabase } from "@/lib/supabase";
import { photoImageUrl, type PhotoWithGuest } from "@/lib/photos";

const INITIAL_LIMIT = 200;
const MAX_PHOTOS = 500;

type Speed = "slow" | "normal" | "fast";

const SPEED_PX_PER_SEC: Record<Speed, number> = {
  slow: 12,
  normal: 28,
  fast: 60,
};

const WALL_COLS =
  "id, unit_number, guest_id, storage_path, image_url, guest_name, depot, type, caption, status, created_at, moderated_at, guest:guests(name, depot)";

function parseSpeed(raw: string | null): Speed {
  if (raw === "slow" || raw === "fast") return raw;
  return "normal";
}

function timeAgo(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 30) return "JUST NOW";
  if (sec < 60) return `${sec} SEC AGO`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} MIN AGO`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} HR AGO`;
  const d = Math.round(hr / 24);
  return `${d} DAY${d === 1 ? "" : "S"} AGO`;
}

export default function WallPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100dvh", background: "var(--color-paper)" }} />}>
      <Wall />
    </Suspense>
  );
}

function Wall() {
  const params = useSearchParams();
  const speed = parseSpeed(params.get("speed"));

  const [photos, setPhotos] = useState<PhotoWithGuest[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const copyARef = useRef<HTMLDivElement | null>(null);

  // Tick "time ago" labels every 20s so they stay roughly current.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const loadInitial = useCallback(async () => {
    const [rowsRes, countRes] = await Promise.all([
      supabase
        .from("photos")
        .select(WALL_COLS)
        .eq("type", "photo")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(INITIAL_LIMIT),
      supabase
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("type", "photo")
        .eq("status", "approved"),
    ]);
    if (rowsRes.data) setPhotos(rowsRes.data as unknown as PhotoWithGuest[]);
    if (typeof countRes.count === "number") setTotalCount(countRes.count);
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitial();
  }, [loadInitial]);

  // Realtime: prepend approved guest photos as they arrive. Cap the
  // array so this can run on a laptop all day without unbounded growth.
  useEffect(() => {
    const channel = supabase
      .channel("welchfest-wall")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "welchfest", table: "photos" },
        (payload) => {
          const incoming = payload.new as PhotoWithGuest;
          if (incoming.type !== "photo") return;
          if (incoming.status !== "approved") return;
          setPhotos((prev) => {
            if (prev.some((p) => p.id === incoming.id)) return prev;
            const next = [incoming, ...prev];
            return next.length > MAX_PHOTOS ? next.slice(0, MAX_PHOTOS) : next;
          });
          setTotalCount((c) => (c === null ? c : c + 1));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "welchfest", table: "photos" },
        (payload) => {
          const updated = payload.new as PhotoWithGuest;
          setPhotos((prev) => {
            // If the row was hidden / no longer approved / changed type,
            // drop it. Otherwise patch in-place.
            if (
              updated.status !== "approved" ||
              updated.type !== "photo"
            ) {
              return prev.filter((p) => p.id !== updated.id);
            }
            return prev.map((p) =>
              p.id === updated.id ? { ...p, ...updated } : p
            );
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll loop. Render the list twice; when scrollTop crosses the
  // height of the first copy, subtract it. The wrap is invisible because
  // both copies are identical at that scroll position.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (photos.length === 0) return;

    const pxPerSec = SPEED_PX_PER_SEC[speed];
    let raf = 0;
    let last = performance.now();
    let stopped = false;

    function step(now: number) {
      if (stopped || !scroller) return;
      const dt = (now - last) / 1000;
      last = now;
      const copyHeight = copyARef.current?.offsetHeight ?? 0;
      if (copyHeight > 0) {
        scroller.scrollTop += pxPerSec * dt;
        if (scroller.scrollTop >= copyHeight) {
          scroller.scrollTop -= copyHeight;
        }
      }
      raf = requestAnimationFrame(step);
    }

    function onVisibility() {
      // Reset the last timestamp when coming back so dt doesn't jump.
      if (document.visibilityState === "visible") {
        last = performance.now();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(step);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [photos.length, speed]);

  const countDisplay = useMemo(() => {
    if (totalCount === null) return "—";
    return String(totalCount).padStart(3, "0");
  }, [totalCount]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        height: "100dvh",
        background: "var(--color-paper)",
        color: "var(--color-ink)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "14px 28px",
          borderBottom: "2px solid var(--color-ink)",
          background: "var(--color-card)",
        }}
      >
        <WelchMark size={44} mode="real" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.32em",
              color: "var(--color-ink)",
            }}
          >
            WELCHFEST · DUXFORD · 13 JUNE 2026
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              marginTop: 4,
            }}
          >
            Live Manifest
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.22em",
              color: "var(--color-faded)",
              fontWeight: 600,
            }}
          >
            UNITS LOGGED
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 34,
              fontWeight: 700,
              lineHeight: 1,
              color: "var(--color-blue-deep)",
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {countDisplay}
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {bootstrapped && photos.length === 0 ? (
          <EmptyState />
        ) : (
          <div ref={trackRef}>
            <div ref={copyARef}>
              <PhotoGrid photos={photos} nowMs={nowMs} />
            </div>
            <div aria-hidden>
              <PhotoGrid photos={photos} nowMs={nowMs} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function PhotoGrid({
  photos,
  nowMs,
}: {
  photos: PhotoWithGuest[];
  nowMs: number;
}) {
  return (
    <div className="wall-grid">
      {photos.map((p) => (
        <PhotoCard key={p.id} photo={p} nowMs={nowMs} />
      ))}
      <style jsx>{`
        .wall-grid {
          column-count: 3;
          column-gap: 18px;
          padding: 18px 22px;
        }
        @media (min-width: 1400px) {
          .wall-grid {
            column-count: 4;
          }
        }
        @media (min-width: 2000px) {
          .wall-grid {
            column-count: 5;
          }
        }
        @media (max-width: 900px) {
          .wall-grid {
            column-count: 2;
          }
        }
      `}</style>
    </div>
  );
}

function PhotoCard({
  photo,
  nowMs,
}: {
  photo: PhotoWithGuest;
  nowMs: number;
}) {
  const url = photoImageUrl(photo);
  const guest = photo.guest_name ?? photo.guest?.name ?? "Guest";
  const depot = photo.depot ?? photo.guest?.depot ?? "—";
  return (
    <figure
      style={{
        breakInside: "avoid",
        marginBottom: 18,
        background: "var(--color-card)",
        border: "1.5px solid var(--color-ink)",
        boxShadow: "3px 3px 0 rgba(30, 27, 22, 0.18)",
        display: "block",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        loading="lazy"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
        }}
      />
      <figcaption
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
          padding: "8px 10px",
          borderTop: "1px solid var(--color-ink)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--color-ink)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
            flex: 1,
          }}
        >
          {guest}{" "}
          <span style={{ color: "var(--color-blue)", marginLeft: 4 }}>
            {depot}
          </span>
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--color-faded)",
            letterSpacing: "0.12em",
            whiteSpace: "nowrap",
          }}
        >
          {timeAgo(photo.created_at, nowMs)}
        </span>
      </figcaption>
    </figure>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: 40,
        textAlign: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--color-faded)",
      }}
    >
      Awaiting first cargo.
    </div>
  );
}
