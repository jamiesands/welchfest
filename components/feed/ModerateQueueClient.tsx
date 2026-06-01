"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { publicUrl, unit3, formatClock, type PhotoWithGuest } from "@/lib/photos";

type Props = {
  initialLive: PhotoWithGuest[];
  initialRemoved: PhotoWithGuest[];
};

type View = "live" | "removed";

export default function ModerateQueueClient({
  initialLive,
  initialRemoved,
}: Props) {
  const [live, setLive] = useState<PhotoWithGuest[]>(initialLive);
  const [removed, setRemoved] = useState<PhotoWithGuest[]>(initialRemoved);
  const [view, setView] = useState<View>("live");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/moderate/queue", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      live: PhotoWithGuest[];
      removed: PhotoWithGuest[];
    };
    setLive(data.live);
    setRemoved(data.removed);
  }, []);

  // Poll while the tab is visible so new uploads show up without a reload.
  useEffect(() => {
    function tick() {
      if (document.visibilityState === "visible") refresh();
    }
    const id = window.setInterval(tick, 10_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  async function remove(photo: PhotoWithGuest) {
    setBusyId(photo.id);
    const res = await fetch("/api/moderate/hide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: photo.id }),
    });
    setBusyId(null);
    setConfirmId(null);
    if (!res.ok) return;
    startTransition(() => {
      setLive((prev) => prev.filter((p) => p.id !== photo.id));
      setRemoved((prev) => [
        { ...photo, status: "hidden" },
        ...prev.filter((p) => p.id !== photo.id),
      ]);
    });
  }

  async function restore(photo: PhotoWithGuest) {
    setBusyId(photo.id);
    const res = await fetch("/api/moderate/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: photo.id }),
    });
    setBusyId(null);
    if (!res.ok) return;
    startTransition(() => {
      setRemoved((prev) => prev.filter((p) => p.id !== photo.id));
      setLive((prev) => [
        { ...photo, status: "approved" },
        ...prev.filter((p) => p.id !== photo.id),
      ]);
    });
  }

  const list = view === "live" ? live : removed;

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Plain explanation */}
      <div
        style={{
          display: "flex",
          gap: 9,
          alignItems: "flex-start",
          padding: "9px 16px",
          borderBottom: "1.5px solid var(--color-ink)",
          background: "var(--color-card-deep)",
        }}
      >
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            width: 17,
            height: 17,
            marginTop: 1,
            borderRadius: "50%",
            border: "1.5px solid var(--color-blue-deep)",
            color: "var(--color-blue-deep)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: "14px",
            textAlign: "center",
          }}
        >
          i
        </span>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: 12.5,
            lineHeight: 1.35,
            color: "var(--color-ink)",
          }}
        >
          These are the photos guests have posted. Tap <strong>Remove</strong> to
          pull anything that shouldn&rsquo;t be up — it disappears from the wall
          straight away. Removed photos go to the <strong>Removed</strong> tab,
          where you can put them back.
        </p>
      </div>

      {/* Live / Removed toggle */}
      <div
        role="tablist"
        style={{
          display: "flex",
          borderBottom: "1.5px solid var(--color-ink)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        <ToggleTab
          active={view === "live"}
          onClick={() => setView("live")}
          label={`Live · ${live.length}`}
          rightBorder
        />
        <ToggleTab
          active={view === "removed"}
          onClick={() => setView("removed")}
          label={`Removed · ${removed.length}`}
        />
      </div>

      {list.length === 0 && (
        <div
          style={{
            margin: "16px",
            border: "1.5px dashed var(--color-ink)",
            opacity: 0.55,
            padding: "30px 16px",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {view === "live"
            ? "No photos posted yet."
            : "Nothing removed. All good."}
        </div>
      )}

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: list.length ? "14px 16px" : 0,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {list.map((p) => {
          const busy = busyId === p.id;
          const confirming = confirmId === p.id;
          return (
            <li
              key={p.id}
              style={{
                border: "1.5px solid var(--color-ink)",
                background: "var(--color-card)",
                boxShadow: "2px 2px 0 rgba(30,27,22,0.18)",
                opacity: busy ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  position: "relative",
                  background: "var(--color-card-deep)",
                  borderBottom: "1.5px solid var(--color-ink)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicUrl(p.storage_path)}
                  alt={`Unit ${unit3(p.unit_number)}`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    maxHeight: 320,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                {p.type === "360" && (
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      padding: "2px 6px",
                      background: "var(--color-blue)",
                      color: "var(--color-paper)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                  >
                    360°
                  </span>
                )}
              </div>

              <div style={{ padding: "10px 12px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--color-faded)",
                    letterSpacing: "0.1em",
                  }}
                >
                  UNIT {unit3(p.unit_number)} · {formatClock(p.created_at)}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  {p.guest?.name ?? "Unknown guest"}{" "}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--color-blue)",
                      marginLeft: 4,
                    }}
                  >
                    {p.guest?.depot ?? "—"}
                  </span>
                </div>
                {p.caption && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12.5,
                      fontStyle: "italic",
                      opacity: 0.75,
                      marginTop: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    &ldquo;{p.caption}&rdquo;
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  {view === "live" ? (
                    confirming ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => remove(p)}
                          disabled={busyId !== null}
                          style={solidStamp}
                        >
                          CONFIRM REMOVE
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          disabled={busyId !== null}
                          style={outlineBtn}
                        >
                          CANCEL
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(p.id)}
                        disabled={busyId !== null}
                        style={{ ...outlineStamp, width: "100%" }}
                      >
                        REMOVE
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => restore(p)}
                      disabled={busyId !== null}
                      style={{ ...solidBlue, width: "100%" }}
                    >
                      {busy ? "RESTORING…" : "RESTORE TO WALL"}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ToggleTab({
  active,
  onClick,
  label,
  rightBorder,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  rightBorder?: boolean;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        textAlign: "center",
        padding: "11px 0",
        minHeight: 44,
        background: active ? "var(--color-ink)" : "transparent",
        color: active ? "var(--color-paper)" : "var(--color-ink)",
        border: 0,
        borderRight: rightBorder ? "1.5px solid var(--color-ink)" : "none",
        fontFamily: "inherit",
        fontSize: "inherit",
        letterSpacing: "inherit",
        textTransform: "inherit",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const baseBtn: React.CSSProperties = {
  padding: "12px 10px",
  minHeight: 44,
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.16em",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const outlineStamp: React.CSSProperties = {
  ...baseBtn,
  background: "transparent",
  color: "var(--color-stamp)",
  border: "1.5px solid var(--color-stamp)",
};

const solidStamp: React.CSSProperties = {
  ...baseBtn,
  background: "var(--color-stamp)",
  color: "var(--color-paper)",
  border: "none",
};

const outlineBtn: React.CSSProperties = {
  ...baseBtn,
  background: "transparent",
  color: "var(--color-ink)",
  border: "1.5px solid var(--color-ink)",
};

const solidBlue: React.CSSProperties = {
  ...baseBtn,
  background: "var(--color-blue-deep)",
  color: "var(--color-paper)",
  border: "none",
};
