"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";
import WBStamp from "@/components/waybill/WBStamp";
import { supabase } from "@/lib/supabase";
import { BUCKET } from "@/lib/photos";
import { resizeAndCompress } from "@/lib/image";

const MAX_BYTES = 25 * 1024 * 1024;
const COMPRESS_THRESHOLD = 2 * 1024 * 1024;

const PUBLIC_URL_BASE = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? `${url}/storage/v1/object/public/${BUCKET}/` : null;
})();

type Design = {
  id: string;
  guest_id: string | null;
  name: string;
  employee_name: string | null;
  image_url: string;
  created_at: string;
};

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "jpg";
  return name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
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

export default function DesignsPage() {
  const router = useRouter();
  const [guestId, setGuestId] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [name, setName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [open, setOpen] = useState<Design | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guest session bootstrap. Name pre-fills from welchfest.guests.
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
        .select("id, name")
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (!data) {
        router.replace("/join");
        return;
      }
      setGuestId(id);
      setName(data.name);
      setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Tick time-ago labels.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from("lorry_designs")
      .select("id, guest_id, name, employee_name, image_url, created_at")
      .order("created_at", { ascending: false });
    if (data) setDesigns(data as unknown as Design[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel("welchfest-designs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "welchfest", table: "lorry_designs" },
        (payload) => {
          const incoming = payload.new as Design;
          setDesigns((prev) => {
            if (prev.some((d) => d.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Dismiss the SUBMITTED stamp after a moment so the form is ready for
  // another go.
  useEffect(() => {
    if (submittedAt === null) return;
    const id = window.setTimeout(() => setSubmittedAt(null), 4000);
    return () => window.clearTimeout(id);
  }, [submittedAt]);

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_BYTES) {
      setError("File over 25MB — try a smaller one.");
      setFile(null);
      e.target.value = "";
      return;
    }
    setFile(f);
  }

  const canSubmit = !!guestId && !!name.trim() && !!file && !submitting;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const body =
        file && file.size > COMPRESS_THRESHOLD
          ? await resizeAndCompress(file, { maxEdge: 2400, quality: 0.85 })
          : file!;
      const stamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const ext = file ? extOf(file.name) : "jpg";
      const path = `lorry-designs/${stamp}-${rand}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, body, {
          contentType: body.type || "image/jpeg",
          upsert: false,
        });
      if (upErr) throw upErr;

      const imageUrl = PUBLIC_URL_BASE
        ? `${PUBLIC_URL_BASE}${path}`
        : supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

      const { error: insErr } = await supabase
        .from("lorry_designs")
        .insert({
          guest_id: guestId,
          name: name.trim(),
          employee_name: employeeName.trim() || null,
          image_url: imageUrl,
        });
      if (insErr) throw insErr;

      setFile(null);
      setEmployeeName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSubmittedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const justSubmitted = submittedAt !== null;

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto relative">
      <WBLetterhead subtitle="Design a Lorry" code="Form W/DSG" />

      <form
        onSubmit={onSubmit}
        style={{
          padding: "14px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          borderBottom: "1.5px solid var(--color-ink)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13.5,
            lineHeight: 1.4,
          }}
        >
          Draw your lorry. Photograph it. Upload it.{" "}
          <span style={{ color: "var(--color-blue-deep)", fontWeight: 700 }}>
            Best design wins a Lego set.
          </span>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <WBLabel>Designer</WBLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={120}
            disabled={!bootstrapped}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <WBLabel>Welch employee (optional)</WBLabel>
          <input
            type="text"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            placeholder="If a Welch employee, who?"
            maxLength={120}
            style={inputStyle}
          />
        </label>

        <div>
          <WBLabel style={{ marginBottom: 6 }}>Photo of design</WBLabel>
          <div
            onClick={() => !submitting && fileInputRef.current?.click()}
            style={{
              border: "1.5px dashed var(--color-ink)",
              background: previewUrl ? "var(--color-card-deep)" : "var(--color-card)",
              minHeight: 160,
              cursor: submitting ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Selected preview"
                style={{
                  width: "100%",
                  maxHeight: 280,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--color-faded)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  padding: 22,
                }}
              >
                Tap to choose a photo or take one
                <br />
                <span style={{ fontSize: 9, opacity: 0.7 }}>
                  JPG · PNG · HEIC · ≤25MB
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickFile}
              style={{ display: "none" }}
              aria-label="Choose a photo or take one"
            />
          </div>
        </div>

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

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              flex: 1,
              background: "var(--color-blue-deep)",
              color: "var(--color-paper)",
              padding: "13px 16px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.18em",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.55,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{submitting ? "SENDING…" : "SUBMIT DESIGN"}</span>
            <span aria-hidden>→</span>
          </button>
          {justSubmitted && <WBStamp rotate={-8}>Submitted ✓</WBStamp>}
        </div>
      </form>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "10px 16px 4px",
        }}
      >
        <WBLabel>Gallery · {designs.length}</WBLabel>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--color-faded)",
            letterSpacing: "0.14em",
          }}
        >
          LIVE
        </span>
      </div>

      <div style={{ flex: 1, paddingBottom: 64 }}>
        {designs.length === 0 ? (
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
            No designs yet. Be the first.
          </div>
        ) : (
          <ul
            className="design-grid"
            style={{
              listStyle: "none",
              padding: "0 14px",
              margin: 0,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {designs.map((d) => (
              <li key={d.id}>
                <DesignCard design={d} nowMs={nowMs} onOpen={() => setOpen(d)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bottom nav (mirrors /feed /songs /awards) */}
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
            gap: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <Link href="/feed" style={{ opacity: 0.55, color: "inherit" }}>
            Photos
          </Link>
          <Link href="/songs" style={{ opacity: 0.55, color: "inherit" }}>
            Songs
          </Link>
          <Link href="/awards" style={{ opacity: 0.55, color: "inherit" }}>
            Awards
          </Link>
          <span
            style={{
              fontWeight: 700,
              borderBottom: "2px solid var(--color-blue-deep)",
              paddingBottom: 2,
            }}
          >
            Design
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--color-faded)",
            letterSpacing: "0.12em",
          }}
        >
          FORM W/DSG
        </div>
      </div>

      {open && <Lightbox design={open} onClose={() => setOpen(null)} />}
    </main>
  );
}

function DesignCard({
  design,
  nowMs,
  onOpen,
}: {
  design: Design;
  nowMs: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: "var(--color-card)",
        border: "1.5px solid var(--color-ink)",
        boxShadow: "2px 2px 0 rgba(30,27,22,0.22)",
        padding: 0,
        cursor: "pointer",
        font: "inherit",
        color: "var(--color-ink)",
      }}
      aria-label={`Open ${design.name}'s design`}
    >
      <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "var(--color-card-deep)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.image_url}
          alt=""
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
      <div
        style={{
          padding: "6px 8px",
          borderTop: "1px solid var(--color-ink)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-ink)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {design.name}
        </div>
        {design.employee_name && (
          <div
            style={{
              fontSize: 9,
              color: "var(--color-blue)",
              letterSpacing: "0.1em",
              marginTop: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            ✦ {design.employee_name}
          </div>
        )}
        <div
          style={{
            fontSize: 9,
            color: "var(--color-faded)",
            letterSpacing: "0.12em",
            marginTop: 1,
          }}
        >
          {timeAgo(design.created_at, nowMs)}
        </div>
      </div>
    </button>
  );
}

function Lightbox({ design, onClose }: { design: Design; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${design.name}'s design`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 18, 14, 0.94)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          color: "var(--color-paper)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {design.name.toUpperCase()}
          {design.employee_name && (
            <span style={{ color: "var(--color-blue-soft)", marginLeft: 10 }}>
              ✦ {design.employee_name.toUpperCase()}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "transparent",
            border: "1.5px solid var(--color-paper)",
            color: "var(--color-paper)",
            padding: "4px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 12px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.image_url}
          alt=""
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
      <div
        style={{
          padding: "14px 18px 22px",
          color: "rgba(239,232,212,0.6)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {new Date(design.created_at).toLocaleString("en-GB", {
          timeZone: "Europe/London",
        })}
      </div>
    </div>
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
