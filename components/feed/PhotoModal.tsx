"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import {
  photoDepot,
  photoGuestName,
  photoImageUrl,
  unit3,
  formatClock,
  type PhotoWithGuest,
} from "@/lib/photos";

const PANNELLUM_CSS =
  "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
const PANNELLUM_JS =
  "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";

type PannellumViewer = {
  destroy: () => void;
};

type PannellumGlobal = {
  viewer: (
    target: HTMLElement | string,
    config: Record<string, unknown>
  ) => PannellumViewer;
};

declare global {
  interface Window {
    pannellum?: PannellumGlobal;
  }
}

type Props = {
  photo: PhotoWithGuest;
  onClose: () => void;
};

export default function PhotoModal({ photo, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumViewer | null>(null);
  const [scriptReady, setScriptReady] = useState(
    typeof window !== "undefined" && !!window.pannellum
  );

  const url = photoImageUrl(photo);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (photo.type !== "360" || !scriptReady || !ref.current) return;
    if (!window.pannellum) return;
    viewerRef.current = window.pannellum.viewer(ref.current, {
      type: "equirectangular",
      panorama: url,
      autoLoad: true,
      autoRotate: -2,
      compass: false,
      showZoomCtrl: true,
      showFullscreenCtrl: false,
      hfov: 100,
    });
    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [photo.type, scriptReady, url]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Unit ${unit3(photo.unit_number)}`}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 18, 14, 0.94)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
      }}
      onClick={onClose}
    >
      {photo.type === "360" && (
        <>
          <link rel="stylesheet" href={PANNELLUM_CSS} />
          <Script
            src={PANNELLUM_JS}
            strategy="afterInteractive"
            onLoad={() => setScriptReady(true)}
          />
        </>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          color: "var(--color-paper)",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          letterSpacing: "0.16em",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          UNIT {unit3(photo.unit_number)} ·{" "}
          <span style={{ color: photo.type === "360" ? "var(--color-blue-soft)" : "inherit" }}>
            {photo.type === "360" ? "360°" : "PHOTO"}
          </span>
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
            fontSize: 16,
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
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {photo.type === "360" ? (
          <div
            ref={ref}
            style={{ width: "100%", height: "100%", background: "#000" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={photo.caption ?? `Unit ${unit3(photo.unit_number)}`}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        )}
      </div>

      <div
        style={{
          padding: "14px 18px 22px",
          color: "var(--color-paper)",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {photoGuestName(photo)}{" "}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--color-blue-soft)",
              marginLeft: 6,
            }}
          >
            {photoDepot(photo)}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "rgba(239, 232, 212, 0.6)",
            letterSpacing: "0.1em",
            marginTop: 2,
          }}
        >
          {formatClock(photo.created_at)}
        </div>
        {photo.caption && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontStyle: "italic",
              marginTop: 8,
              opacity: 0.85,
              lineHeight: 1.4,
            }}
          >
            “{photo.caption}”
          </div>
        )}
      </div>
    </div>
  );
}
