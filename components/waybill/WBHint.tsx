import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

// A plain-language one-liner that explains what a screen is for. Sans (not
// mono) on purpose so it reads as a friendly instruction rather than waybill
// chrome. Sits just under the letterhead on each guest screen.
export default function WBHint({ children }: Props) {
  return (
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
          fontSize: 13,
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
          fontSize: 15,
          lineHeight: 1.35,
          color: "var(--color-ink)",
        }}
      >
        {children}
      </p>
    </div>
  );
}
