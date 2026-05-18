import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  color?: string;
  rotate?: number;
  style?: CSSProperties;
};

export default function WBStamp({
  children,
  color = "#b8412a",
  rotate = -6,
  style,
}: Props) {
  return (
    <div
      style={{
        display: "inline-block",
        border: `2px solid ${color}`,
        color,
        padding: "4px 10px",
        borderRadius: 4,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        transform: `rotate(${rotate}deg)`,
        background: `${color}11`,
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
