"use client";

import { useEffect, useState, useTransition } from "react";
import { publicUrl, unit3, formatClock, type PhotoWithGuest } from "@/lib/photos";
import WBLabel from "@/components/waybill/WBLabel";

type Props = {
  initial: PhotoWithGuest[];
  initialHiddenToday: number;
};

export default function ModerateQueueClient({
  initial,
  initialHiddenToday,
}: Props) {
  const [pending, setPending] = useState<PhotoWithGuest[]>(initial);
  const [hiddenToday, setHiddenToday] = useState(initialHiddenToday);
  const [pendingAction, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      if (document.visibilityState !== "visible") return;
      const res = await fetch("/api/moderate/queue", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as {
        pending: PhotoWithGuest[];
        hiddenToday: number;
      };
      setPending(data.pending);
      setHiddenToday(data.hiddenToday);
    }
    const id = window.setInterval(tick, 10_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  async function act(photo: PhotoWithGuest, action: "approve" | "hide") {
    setBusyId(photo.id);
    const res = await fetch(`/api/moderate/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: photo.id }),
    });
    setBusyId(null);
    if (!res.ok) return;
    startTransition(() => {
      setPending((prev) => prev.filter((p) => p.id !== photo.id));
      if (action === "hide") setHiddenToday((n) => n + 1);
    });
  }

  return (
    <div style={{ padding: "14px 18px 80px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div>
          <WBLabel>Status</WBLabel>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.1,
              marginTop: 2,
            }}
          >
            {pending.length} pending ·{" "}
            <span style={{ color: "var(--color-stamp)" }}>
              {hiddenToday} hidden today
            </span>
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-faded)",
            letterSpacing: "0.14em",
          }}
        >
          AUTO · 10s
        </div>
      </div>

      {pending.length === 0 && (
        <div
          style={{
            border: "1.5px dashed var(--color-ink)",
            opacity: 0.5,
            padding: "30px 16px",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Queue clear. Carry on.
        </div>
      )}

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {pending.map((p) => (
          <li
            key={p.id}
            style={{
              border: "1.5px solid var(--color-ink)",
              background: "var(--color-card)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              opacity: busyId === p.id || pendingAction ? 0.6 : 1,
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  width: 100,
                  height: 100,
                  flexShrink: 0,
                  background: "var(--color-card-deep)",
                  border: "1px solid var(--color-ink)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicUrl(p.storage_path)}
                  alt={`Unit ${unit3(p.unit_number)} thumbnail`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  loading="lazy"
                />
                {p.type === "360" && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      padding: "2px 5px",
                      background: "var(--color-blue)",
                      color: "var(--color-paper)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                  >
                    360°
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
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
                      fontSize: 12,
                      fontStyle: "italic",
                      color: "var(--color-ink)",
                      opacity: 0.75,
                      marginTop: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    “{p.caption}”
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={() => act(p, "approve")}
                disabled={busyId !== null}
                style={{
                  background: "var(--color-blue-deep)",
                  color: "var(--color-paper)",
                  padding: "12px 10px",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.18em",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  cursor: busyId === null ? "pointer" : "wait",
                }}
              >
                APPROVE
              </button>
              <button
                type="button"
                onClick={() => act(p, "hide")}
                disabled={busyId !== null}
                style={{
                  background: "transparent",
                  color: "var(--color-stamp)",
                  padding: "12px 10px",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.18em",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "1.5px solid var(--color-stamp)",
                  cursor: busyId === null ? "pointer" : "wait",
                }}
              >
                HIDE
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
