import type { ReactNode } from "react";

type Props = {
  state: "loading" | "error" | "empty";
  empty: ReactNode;
  onRetry?: () => void;
};

// Shared loading / failed / empty block for guest-facing lists
// (HARDENING-AUDIT.md I1). A failed fetch must never masquerade as a true
// empty state ("No trucks added yet" on one bar of signal), so the three
// cases are explicit and the error case offers a retry.
export default function WBListStatus({ state, empty, onRetry }: Props) {
  return (
    <div
      style={{
        padding: "40px 24px",
        textAlign: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--color-faded)",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        lineHeight: 1.6,
      }}
    >
      {state === "loading" && <span>Loading…</span>}
      {state === "empty" && <span>{empty}</span>}
      {state === "error" && (
        <>
          <div style={{ color: "var(--color-stamp)", fontWeight: 700 }}>
            Can&rsquo;t reach the depot.
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
            Patchy signal — it happens out here.
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                marginTop: 14,
                background: "var(--color-blue-deep)",
                color: "var(--color-paper)",
                border: "none",
                padding: "10px 18px",
                minHeight: 44,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.16em",
                boxShadow: "2px 2px 0 var(--color-ink)",
                cursor: "pointer",
              }}
            >
              TAP TO RETRY
            </button>
          )}
        </>
      )}
    </div>
  );
}
