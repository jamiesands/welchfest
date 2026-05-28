"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";
import { supabase } from "@/lib/supabase";
import { BUCKET } from "@/lib/photos";

const ADMIN_PASSPHRASE = process.env.NEXT_PUBLIC_ADMIN_PASSPHRASE ?? "";
const AUTH_KEY = "admin_auth";

const PUBLIC_URL_BASE = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? `${url}/storage/v1/object/public/${BUCKET}/` : null;
})();

type Depot = "DXF" | "BED" | "STI";
type Band = "new" | "mid" | "veteran";

type Truck = {
  id: string;
  driver_name: string;
  display_name: string;
  depot: Depot;
  year: number;
  band: Band;
  photo_url: string | null;
  created_at: string;
};

const BAND_ORDER: Band[] = ["new", "mid", "veteran"];
const BAND_LABEL: Record<Band, string> = {
  new: "NEW",
  mid: "MID",
  veteran: "VETERAN",
};

function previewBand(year: number | null): Band | null {
  if (year === null || Number.isNaN(year)) return null;
  if (year >= 2022) return "new";
  if (year >= 2018) return "mid";
  return "veteran";
}

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "jpg";
  return name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

export default function AdminTrucksPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(sessionStorage.getItem(AUTH_KEY) === "true");
  }, []);

  function onSubmitAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ADMIN_PASSPHRASE) {
      setAuthError("NEXT_PUBLIC_ADMIN_PASSPHRASE not set on this build.");
      return;
    }
    if (passphrase === ADMIN_PASSPHRASE) {
      sessionStorage.setItem(AUTH_KEY, "true");
      setAuthed(true);
    } else {
      setAuthError("Nope. Try again.");
    }
  }

  if (authed === null) {
    return <main className="min-h-dvh bg-paper" />;
  }

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto">
      <WBLetterhead subtitle="Truck Entries" code="Form W/TRK" />
      {authed ? (
        <TrucksPanel />
      ) : (
        <form
          onSubmit={onSubmitAuth}
          style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 12 }}
        >
          <WBLabel>Passphrase</WBLabel>
          <input
            type="password"
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="·····"
            className="w-full bg-transparent outline-none"
            style={{
              borderBottom: "1.5px solid var(--color-ink)",
              fontFamily: "var(--font-mono)",
              fontSize: 18,
              padding: "6px 0",
              color: "var(--color-ink)",
            }}
          />
          {authError && (
            <div
              role="alert"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-stamp)",
                fontWeight: 700,
              }}
            >
              {authError}
            </div>
          )}
          <button
            type="submit"
            style={{
              background: "var(--color-blue-deep)",
              color: "var(--color-paper)",
              padding: "12px 14px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.18em",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            UNLOCK →
          </button>
        </form>
      )}
    </main>
  );
}

function TrucksPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [driverName, setDriverName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [depot, setDepot] = useState<Depot>("DXF");
  const [yearStr, setYearStr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const yearNum = useMemo(() => {
    const n = Number(yearStr);
    return Number.isInteger(n) && n >= 1980 && n <= 2026 ? n : null;
  }, [yearStr]);
  const liveBand = previewBand(yearNum);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from("trucks")
      .select("id, driver_name, display_name, depot, year, band, photo_url, created_at")
      .order("created_at", { ascending: false });
    if (data) setTrucks(data as unknown as Truck[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel("welchfest-trucks-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "welchfest", table: "trucks" },
        () => {
          fetchAll();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  }

  const canSubmit =
    !!driverName.trim() &&
    !!displayName.trim() &&
    yearNum !== null &&
    !submitting;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      let photoUrl: string | null = null;
      if (file) {
        // Reserve the row id by generating a UUID here is fragile; instead,
        // upload to trucks/<timestamp>-<random>.<ext> and let the row hold
        // the public URL. Storage path uniqueness is on us.
        const stamp = Date.now();
        const rand = Math.random().toString(36).slice(2, 8);
        const path = `trucks/${stamp}-${rand}.${extOf(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });
        if (upErr) throw upErr;
        photoUrl = PUBLIC_URL_BASE
          ? `${PUBLIC_URL_BASE}${path}`
          : supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }

      const res = await fetch("/api/admin/trucks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          driver_name: driverName.trim(),
          display_name: displayName.trim(),
          depot,
          year: yearNum,
          photo_url: photoUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Create failed");
      }

      setDriverName("");
      setDisplayName("");
      setYearStr("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Realtime will surface the row; refetch as a safety net.
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/trucks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Delete failed");
        return;
      }
      setTrucks((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = useMemo(() => {
    const map: Record<Band, Truck[]> = { new: [], mid: [], veteran: [] };
    for (const t of trucks) map[t.band].push(t);
    return map;
  }, [trucks]);

  return (
    <div style={{ padding: "16px 18px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Driver">
          <TextInput value={driverName} onChange={setDriverName} placeholder="Driver name" />
        </Field>
        <Field label="Display / reg">
          <TextInput value={displayName} onChange={setDisplayName} placeholder="KX23 ABC · Big Blue" />
        </Field>
        <Field label="Depot">
          <select
            value={depot}
            onChange={(e) => setDepot(e.target.value as Depot)}
            style={selectStyle}
          >
            <option value="DXF">DXF · Duxford</option>
            <option value="BED">BED · Bedford</option>
            <option value="STI">STI · St Ives</option>
          </select>
        </Field>
        <Field label="Year">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="number"
              inputMode="numeric"
              min={1980}
              max={2026}
              value={yearStr}
              onChange={(e) => setYearStr(e.target.value)}
              placeholder="2023"
              style={{ ...inputStyle, width: 110 }}
            />
            <BandPill band={liveBand} />
          </div>
        </Field>
        <Field label="Photo (optional)">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPickFile}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-ink)",
            }}
          />
        </Field>

        {error && (
          <div
            role="alert"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-stamp)",
              border: "1.5px solid var(--color-stamp)",
              background: "#b8412a11",
              padding: "6px 10px",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            background: "var(--color-blue-deep)",
            color: "var(--color-paper)",
            padding: "12px 14px",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.18em",
            fontSize: 12,
            fontWeight: 600,
            border: "none",
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.55,
          }}
        >
          {submitting ? "FILING…" : "ADD ENTRY →"}
        </button>
      </form>

      <div style={{ borderTop: "1.5px solid var(--color-ink)" }} />

      <div>
        <WBLabel style={{ marginBottom: 8 }}>Entries · {trucks.length}</WBLabel>
        {trucks.length === 0 && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-faded)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "12px 0",
            }}
          >
            No trucks logged yet.
          </div>
        )}
        {BAND_ORDER.map((band) => {
          const rows = grouped[band];
          if (rows.length === 0) return null;
          return (
            <section key={band} style={{ marginTop: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <BandPill band={band} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--color-faded)",
                    letterSpacing: "0.14em",
                  }}
                >
                  · {rows.length}
                </span>
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  border: "1.5px solid var(--color-ink)",
                  background: "var(--color-card)",
                }}
              >
                {rows.map((t, i) => (
                  <li
                    key={t.id}
                    style={{
                      padding: 10,
                      borderBottom:
                        i < rows.length - 1
                          ? "1px dashed rgba(30,27,22,0.27)"
                          : "none",
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                        background: "var(--color-card-deep)",
                        border: "1px solid rgba(30,27,22,0.25)",
                        overflow: "hidden",
                      }}
                    >
                      {t.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.photo_url}
                          alt=""
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            color: "var(--color-faded)",
                            letterSpacing: "0.14em",
                          }}
                        >
                          —
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 14,
                          fontWeight: 700,
                          lineHeight: 1.2,
                        }}
                      >
                        {t.display_name}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--color-faded)",
                          marginTop: 1,
                        }}
                      >
                        {t.driver_name} ·{" "}
                        <span style={{ color: "var(--color-blue)" }}>{t.depot}</span>{" "}
                        · {t.year}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(t.id)}
                      disabled={deletingId === t.id}
                      aria-label={`Delete ${t.display_name}`}
                      style={{
                        background: "transparent",
                        border: "1.5px solid var(--color-stamp)",
                        color: "var(--color-stamp)",
                        padding: "4px 8px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        fontWeight: 700,
                        cursor: deletingId === t.id ? "wait" : "pointer",
                        opacity: deletingId === t.id ? 0.5 : 1,
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <WBLabel>{label}</WBLabel>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

function BandPill({ band }: { band: Band | null }) {
  if (!band) {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "var(--color-faded)",
          padding: "2px 6px",
          border: "1.5px dashed var(--color-faded)",
        }}
      >
        BAND ·
      </span>
    );
  }
  const tone =
    band === "new"
      ? { bg: "var(--color-blue-deep)", fg: "var(--color-paper)" }
      : band === "mid"
        ? { bg: "var(--color-ink)", fg: "var(--color-paper)" }
        : { bg: "transparent", fg: "var(--color-ink)" };
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.18em",
        background: tone.bg,
        color: tone.fg,
        padding: "2px 6px",
        border: band === "veteran" ? "1.5px solid var(--color-ink)" : "none",
        fontWeight: 700,
      }}
    >
      {BAND_LABEL[band]}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1.5px solid var(--color-ink)",
  background: "var(--color-paper)",
  padding: "8px 10px",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--color-ink)",
  outline: "none",
  letterSpacing: "0.04em",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "auto",
};
