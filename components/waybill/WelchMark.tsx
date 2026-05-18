import Image from "next/image";
import type { CSSProperties } from "react";

type Props = {
  size?: number;
  color?: string;
  mode?: "mask" | "real" | "shape";
  className?: string;
  style?: CSSProperties;
};

export default function WelchMark({
  size = 32,
  color = "#1e1b16",
  mode = "mask",
  className,
  style,
}: Props) {
  if (mode === "real") {
    return (
      <Image
        src="/welch-mark.png"
        alt="Welch Group"
        width={size}
        height={size}
        className={className}
        style={{ display: "block", ...style }}
        priority
      />
    );
  }
  if (mode === "shape") {
    return (
      <Image
        src="/welch-shape.png"
        alt="Welch Group"
        width={size}
        height={size}
        className={className}
        style={{ display: "block", ...style }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        background: color,
        WebkitMaskImage: "url(/welch-mark.png)",
        maskImage: "url(/welch-mark.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
