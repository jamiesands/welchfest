"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import WBLabel from "@/components/waybill/WBLabel";
import { supabase } from "@/lib/supabase";
import { BUCKET, photoPath } from "@/lib/photos";
import { resizeAndCompress } from "@/lib/image";

const MAX_BYTES = 25 * 1024 * 1024;
const COMPRESS_THRESHOLD = 2 * 1024 * 1024;
const MAX_CAPTION = 140;

const PUBLIC_URL_BASE = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? `${url}/storage/v1/object/public/${BUCKET}/` : null;
})();

type Props = {
  guestId: string;
  guestName: string;
  depot: string;
  onClose: () => void;
};

export default function UploadSheet({ guestId, guestName, depot, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

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

  const pickFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_BYTES) {
      setError("File over 25MB — try a smaller one.");
      setFile(null);
      e.target.value = "";
      return;
    }
    setFile(f);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const body =
        file.size > COMPRESS_THRESHOLD
          ? await resizeAndCompress(file, { maxEdge: 2400, quality: 0.85 })
          : file;
      const path = photoPath(guestId);

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
        .from("photos")
        .insert({
          guest_id: guestId,
          guest_name: guestName,
          depot,
          storage_path: path,
          image_url: imageUrl,
          type: "photo",
          status: "approved",
          caption: caption.trim() || null,
        });
      if (insErr) throw insErr;

      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setError(msg);
      setSubmitting(false);
    }
  }

  const canSubmit = !!file && !submitting;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add a photo"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 18, 14, 0.55)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto"
        style={{
          background: "var(--color-paper)",
          borderTop: "1.5px solid var(--color-ink)",
          padding: "16px 18px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <WBLabel>New photo</WBLabel>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 21,
                fontWeight: 700,
                lineHeight: 1,
                marginTop: 4,
              }}
            >
              Add a photo
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "1.5px solid var(--color-ink)",
              color: "var(--color-ink)",
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
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "1.5px dashed var(--color-ink)",
            background: previewUrl ? "var(--color-card-deep)" : "var(--color-card)",
            minHeight: 180,
            position: "relative",
            overflow: "hidden",
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
                maxHeight: 320,
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--color-faded)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                textAlign: "center",
                padding: 24,
              }}
            >
              Tap to choose a photo or take one
              <br />
              <span style={{ fontSize: 11, opacity: 0.7 }}>JPG · PNG · HEIC · ≤25MB</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={pickFile}
            style={{ display: "none" }}
            aria-label="Choose a photo or take one"
          />
        </div>

        <div>
          <WBLabel style={{ marginBottom: 4 }}>Caption (optional)</WBLabel>
          <div style={{ borderBottom: "1.5px solid var(--color-ink)", paddingBottom: 4 }}>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
              placeholder="Say something."
              rows={2}
              className="w-full bg-transparent outline-none resize-none placeholder:text-faded/60"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 18,
                fontWeight: 500,
                color: "var(--color-ink)",
                lineHeight: 1.3,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-faded)",
              letterSpacing: "0.1em",
              textAlign: "right",
              marginTop: 2,
            }}
          >
            {caption.length}/{MAX_CAPTION}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
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
            fontSize: 14,
            fontWeight: 600,
            width: "100%",
            border: "none",
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.55,
          }}
        >
          <span>{submitting ? "ADDING…" : "ADD PHOTO"}</span>
          <span aria-hidden>→</span>
        </button>
      </form>
    </div>
  );
}
