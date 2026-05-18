import WelchMark from "./WelchMark";

type Props = {
  color?: string;
  size?: number;
  rotate?: number;
};

export default function WBPostmark({
  color = "#2275b3",
  size = 86,
  rotate = -4,
}: Props) {
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        width: size,
        height: size,
        transform: `rotate(${rotate}deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <path
            id="wbring"
            d="M 50,50 m -42,0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0"
          />
        </defs>
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
        />
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke={color}
          strokeWidth="0.6"
          strokeDasharray="2 2"
          opacity="0.7"
        />
        <text
          fontFamily="var(--font-mono)"
          fontSize="6"
          letterSpacing="3"
          fill={color}
          fontWeight="600"
        >
          <textPath href="#wbring" startOffset="0">
            WELCH GROUP · DISPATCH · WELCHFEST · MMXXVI ·
          </textPath>
        </text>
      </svg>
      <div style={{ width: size * 0.46, height: size * 0.46, position: "relative" }}>
        <WelchMark size={size * 0.46} color={color} />
      </div>
    </div>
  );
}
