import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

// `faded` on `paper` clears WCAG AA for large text only — keep this label
// uppercase, mono, ≥9px and weight 600 so its contrast band stays valid.
export default function WBLabel({ children, color, className, style }: Props) {
  return (
    <div
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: color ?? "var(--color-faded)",
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
