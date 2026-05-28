"use client";

import {
  useCallback,
  useEffect,
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

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; index: number; total: number }
  | { kind: "done"; results: UploadResult[] };

type UploadResult = {
  filename: string;
  url: string | null;
  error: string | null;
};

function sanitizeFilename(name: string): string {
  // Strip directory traversal and unsafe characters; keep extension.
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function Admin360Page() {
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
      <WBLetterhead subtitle="360 Upload" code="Form W/360" />
      {authed ? (
        <UploadPanel />
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

function UploadPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<UploadState>({ kind: "idle" });

  const pickFiles = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    setFiles(Array.from(list));
    setState({ kind: "idle" });
  }, []);

  async function uploadAll() {
    if (files.length === 0 || state.kind === "uploading") return;
    const results: UploadResult[] = [];
    for (let i = 0; i < files.length; i++) {
      setState({ kind: "uploading", index: i + 1, total: files.length });
      const file = files[i];
      const safeName = sanitizeFilename(file.name);
      const path = `360/${safeName}`;
      try {
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });
        if (upErr) throw upErr;

        const url = PUBLIC_URL_BASE
          ? `${PUBLIC_URL_BASE}${path}`
          : supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

        const { error: insErr } = await supabase.from("photos").insert({
          guest_id: null,
          guest_name: "Jamie",
          depot: "DXF",
          storage_path: path,
          image_url: url,
          type: "360",
          status: "approved",
        });
        if (insErr) throw insErr;

        results.push({ filename: file.name, url, error: null });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ filename: file.name, url: null, error: msg });
      }
    }
    setState({ kind: "done", results });
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isUploading = state.kind === "uploading";

  return (
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <WBLabel style={{ marginBottom: 6 }}>Sphere files</WBLabel>
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          style={{
            border: "1.5px dashed var(--color-ink)",
            padding: "18px 14px",
            cursor: isUploading ? "wait" : "pointer",
            background: "var(--color-card)",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--color-faded)",
          }}
        >
          Tap to choose JPGs
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={pickFiles}
            style={{ display: "none" }}
            disabled={isUploading}
            aria-label="Choose sphere images"
          />
        </div>
      </div>

      {files.length > 0 && (
        <div>
          <WBLabel style={{ marginBottom: 6 }}>Queue ({files.length})</WBLabel>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              border: "1.5px solid var(--color-ink)",
              background: "var(--color-card)",
            }}
          >
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                style={{
                  padding: "8px 10px",
                  borderBottom:
                    i < files.length - 1
                      ? "1px dashed rgba(30,27,22,0.27)"
                      : "none",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {f.name}
                </span>
                <span style={{ color: "var(--color-faded)" }}>
                  {Math.round(f.size / 1024)}KB
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={uploadAll}
        disabled={files.length === 0 || isUploading}
        style={{
          background: "var(--color-blue-deep)",
          color: "var(--color-paper)",
          padding: "13px 16px",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.18em",
          fontSize: 12,
          fontWeight: 600,
          border: "none",
          cursor: files.length === 0 || isUploading ? "not-allowed" : "pointer",
          opacity: files.length === 0 || isUploading ? 0.5 : 1,
        }}
      >
        {isUploading
          ? `UPLOADING ${state.index} OF ${state.total}…`
          : "UPLOAD ALL →"}
      </button>

      {state.kind === "done" && (
        <div>
          <WBLabel style={{ marginBottom: 6 }}>Result</WBLabel>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              border: "1.5px solid var(--color-ink)",
              background: "var(--color-card)",
            }}
          >
            {state.results.map((r, i) => (
              <li
                key={`${r.filename}-${i}`}
                style={{
                  padding: "10px",
                  borderBottom:
                    i < state.results.length - 1
                      ? "1px dashed rgba(30,27,22,0.27)"
                      : "none",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: r.error ? "var(--color-stamp)" : "var(--color-blue-deep)",
                  }}
                >
                  {r.error ? "FAIL" : "OK"} · {r.filename}
                </div>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 10,
                      color: "var(--color-ink)",
                      wordBreak: "break-all",
                      textDecoration: "underline",
                    }}
                  >
                    {r.url}
                  </a>
                )}
                {r.error && (
                  <div style={{ fontSize: 10, color: "var(--color-stamp)" }}>
                    {r.error}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
