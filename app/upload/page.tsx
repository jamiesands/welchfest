"use client";

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";
import { supabase } from "@/lib/supabase";
import { BUCKET, photoPath, unit3 } from "@/lib/photos";
import { resizeAndCompress } from "@/lib/image";

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_CAPTION = 140;

export default function UploadPage() {
  const router = useRouter();
  const [guestId, setGuestId] = useState<string | null>(null);
  const [type, setType] = useState<"photo" | "360">("photo");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ unit: number; held: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = localStorage.getItem("welchfest:guest_id");
    if (!id) {
      router.replace("/join");
      return;
    }
    setGuestId(id);
  }, [router]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => router.replace("/feed"), 2000);
    return () => window.clearTimeout(id);
  }, [success, router]);

  function pickFile(e: ChangeEvent<HTMLInputElement>) {
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!guestId || !file || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const path = photoPath(guestId);
      const body =
        type === "photo"
          ? await resizeAndCompress(file, { maxEdge: 2400, quality: 0.85 })
          : file;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, body, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      const { data, error: insErr } = await supabase
        .from("photos")
        .insert({
          guest_id: guestId,
          storage_path: path,
          type,
          caption: caption.trim() || null,
        })
        .select("unit_number, status")
        .single();
      if (insErr || !data) throw insErr ?? new Error("insert returned no row");

      setSuccess({ unit: data.unit_number, held: data.status !== "approved" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setError(msg);
      setSubmitting(false);
    }
  }

  const canSubmit = !!guestId && !!file && !submitting && !success;

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto">
      <WBLetterhead subtitle="New Entry" code="Form W/UNIT" />

      <form
        onSubmit={onSubmit}
        className="flex-1 flex flex-col"
        style={{ padding: "14px 18px 0" }}
      >
        {/* §01 — Entry type */}
        <WBLabel style={{ marginBottom: 8 }}>01 · Entry type</WBLabel>
        <div
          role="radiogroup"
          aria-label="Entry type"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            marginBottom: 16,
          }}
        >
          {(["photo", "360"] as const).map((t) => {
            const sel = type === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => setType(t)}
                style={{
                  border: "1.5px solid var(--color-ink)",
                  padding: "10px 8px",
                  background: sel ? "var(--color-ink)" : "transparent",
                  color: sel ? "var(--color-paper)" : "var(--color-ink)",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    opacity: 0.7,
                    letterSpacing: "0.1em",
                  }}
                >
                  KIND
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    marginTop: 2,
                    color: sel ? "var(--color-blue-soft)" : "var(--color-blue)",
                  }}
                >
                  {t === "photo" ? "PHOTO" : "360°"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {t === "photo" ? "Single frame" : "Equirectangular sphere"}
                </div>
              </button>
            );
          })}
        </div>

        {/* §02 — Capture */}
        <WBLabel style={{ marginBottom: 6 }}>02 · Capture</WBLabel>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "1.5px dashed var(--color-ink)",
            background: previewUrl ? "var(--color-card-deep)" : "var(--color-card)",
            minHeight: 180,
            position: "relative",
            overflow: "hidden",
            marginBottom: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected preview"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: 300,
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
                padding: 24,
              }}
            >
              Tap to choose or capture
              <br />
              <span style={{ fontSize: 9, opacity: 0.7 }}>JPG · PNG · HEIC · ≤25MB</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={pickFile}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
            }}
            aria-label="Capture or choose image"
          />
        </div>

        {/* §03 — Caption */}
        <WBLabel style={{ marginBottom: 6 }}>03 · Caption (optional)</WBLabel>
        <div
          style={{
            borderBottom: "1.5px solid var(--color-ink)",
            paddingBottom: 5,
            marginBottom: 6,
          }}
        >
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
            placeholder="Say something."
            rows={2}
            className="w-full bg-transparent outline-none resize-none placeholder:text-faded/60"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--color-ink)",
              lineHeight: 1.3,
            }}
          />
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--color-faded)",
            letterSpacing: "0.1em",
            textAlign: "right",
            marginBottom: 14,
          }}
        >
          {caption.length}/{MAX_CAPTION}
        </div>

        <div style={{ marginTop: "auto", marginBottom: 12, paddingTop: 6 }}>
          {success && (
            <div
              role="status"
              style={{
                marginBottom: 10,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: success.held ? "var(--color-olive)" : "var(--color-blue-deep)",
                border: `1.5px solid ${
                  success.held ? "var(--color-olive)" : "var(--color-blue-deep)"
                }`,
                background: success.held ? "#384a2f11" : "#164b7511",
                padding: "10px 12px",
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              Logged as Unit {unit3(success.unit)}.{" "}
              {success.held
                ? "Held for moderation. Your next entries go straight to the manifest."
                : "Manifest updated."}
            </div>
          )}

          {error && (
            <div
              role="alert"
              style={{
                marginBottom: 10,
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
              padding: "13px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.18em",
              fontSize: 12,
              fontWeight: 600,
              width: "100%",
              border: "none",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.55,
            }}
          >
            <span>
              {submitting ? "FILING…" : success ? "FILED" : "LOG TO MANIFEST"}
            </span>
            <span aria-hidden>→</span>
          </button>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--color-faded)",
              letterSpacing: "0.1em",
            }}
          >
            <Link href="/feed" style={{ color: "var(--color-faded)" }}>
              ← CANCEL · BACK TO MANIFEST
            </Link>
            <span>REV. 04</span>
          </div>
        </div>
      </form>
    </main>
  );
}
