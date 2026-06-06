"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";
import WBPostmark from "@/components/waybill/WBPostmark";
import WBHint from "@/components/waybill/WBHint";
import { supabase } from "@/lib/supabase";

type DepotCode = "DXF" | "BED" | "STI" | "GUEST";

const DEPOTS: { code: DepotCode; name: string }[] = [
  { code: "DXF", name: "Duxford" },
  { code: "BED", name: "Bedford" },
  { code: "STI", name: "St Ives" },
  { code: "GUEST", name: "Guest" },
];

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [depot, setDepot] = useState<DepotCode | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && depot !== null && consent && !submitting;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || !depot) return;
    setSubmitting(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("guests")
      .insert({ name: name.trim(), depot, consent_given: consent })
      .select("id")
      .single();
    if (insertError || !data) {
      setError("Could not file your entry. Try again.");
      setSubmitting(false);
      return;
    }
    localStorage.setItem("welchfest:guest_id", data.id);
    router.replace("/feed");
  }

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto">
      <WBLetterhead />

      <WBHint>
        Welcome! Three quick steps: type your name, tap which depot you&rsquo;re
        from, tick the box, then <strong>Sign &amp; Enter</strong>. Takes about
        ten seconds.
      </WBHint>

      <form
        onSubmit={onSubmit}
        className="flex-1 flex flex-col"
        style={{ padding: "14px 18px 0" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <WBLabel style={{ marginBottom: 6 }}>Welcome</WBLabel>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 30,
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: "-0.02em",
              }}
            >
              Manifest of
              <br />
              Memories
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                marginTop: 6,
                color: "var(--color-faded)",
                letterSpacing: "0.06em",
              }}
            >
              Welchfest · 13 Jun 2026 · Welch&rsquo;s Duxford Depot
            </div>
          </div>
          <WBPostmark color="#2275b3" size={76} rotate={-6} />
        </div>

        <div
          aria-hidden
          style={{
            height: 1,
            background: "var(--color-ink)",
            opacity: 0.2,
            margin: "14px 0",
          }}
        />

        {/* §01 — Your name */}
        <WBLabel style={{ marginBottom: 6 }}>01 · Your name</WBLabel>
        <div
          style={{
            borderBottom: "1.5px solid var(--color-ink)",
            paddingBottom: 5,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            autoCapitalize="words"
            spellCheck={false}
            aria-label="Your name"
            aria-invalid={error ? true : undefined}
            className="w-full bg-transparent outline-none placeholder:text-faded/60"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 21,
              fontWeight: 500,
              color: "var(--color-ink)",
            }}
          />
          <span
            aria-hidden
            className="wb-caret"
            style={{
              borderRight: "1.5px solid var(--color-blue)",
              marginLeft: 2,
              height: 18,
              display: "inline-block",
            }}
          />
        </div>

        {/* §02 — Your depot */}
        <WBLabel style={{ marginBottom: 8 }}>02 · Your depot</WBLabel>
        <div
          role="radiogroup"
          aria-label="Your depot"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            marginBottom: 14,
          }}
          className="sm:!grid-cols-4"
        >
          {DEPOTS.map((d) => {
            const sel = depot === d.code;
            return (
              <button
                key={d.code}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => setDepot(d.code)}
                style={{
                  border: "1.5px solid var(--color-ink)",
                  padding: "8px 6px",
                  background: sel ? "var(--color-ink)" : "transparent",
                  color: sel ? "var(--color-paper)" : "var(--color-ink)",
                  position: "relative",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    opacity: 0.7,
                    letterSpacing: "0.1em",
                  }}
                >
                  CODE
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    marginTop: 2,
                    color: sel ? "var(--color-blue-soft)" : "var(--color-blue)",
                  }}
                >
                  {d.code}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {d.name}
                </div>
                {sel && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--color-blue)",
                    }}
                  >
                    ✕
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* §03 — Consent */}
        <WBLabel style={{ marginBottom: 6 }}>03 · Consent</WBLabel>
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            marginBottom: 12,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              border: "1.5px solid var(--color-ink)",
              marginTop: 1,
              position: "relative",
              flexShrink: 0,
              display: "inline-block",
            }}
          >
            {consent && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 3,
                  top: -1,
                  fontSize: 26,
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-blue)",
                  lineHeight: 1,
                }}
              >
                ✓
              </span>
            )}
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-label="I consent"
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                cursor: "pointer",
                margin: 0,
              }}
            />
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.4 }}>
            I&rsquo;m happy for my photos to appear on the party wall. Anything
            unwanted can be{" "}
            <span style={{ color: "var(--color-blue)", fontWeight: 600 }}>
              hidden
            </span>
            .
          </span>
        </label>

        <div style={{ marginTop: "auto", marginBottom: 12, paddingTop: 12 }}>
          {error && (
            <div
              role="alert"
              style={{
                marginBottom: 10,
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
            <span>{submitting ? "FILING…" : "SIGN & ENTER"}</span>
            <span aria-hidden>→</span>
          </button>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-faded)",
              letterSpacing: "0.1em",
            }}
          >
            <span>FILE COPY · GUEST</span>
            <span>REV. 04</span>
          </div>
        </div>
      </form>
    </main>
  );
}
