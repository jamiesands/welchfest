type Place = 1 | 2 | 3;

const TONE: Record<Place, { main: string; dark: string; text: string }> = {
  1: { main: "#c7a14a", dark: "#9c7a2f", text: "#2e2206" },
  2: { main: "#a7a7af", dark: "#7f7f88", text: "#26262d" },
  3: { main: "#b9794a", dark: "#8f5a34", text: "#311e0e" },
};

const ORDINAL: Record<Place, string> = { 1: "1ST", 2: "2ND", 3: "3RD" };

// An award rosette — scalloped seal with ribbon tails — for the judged truck
// placements. Pure SVG, so it renders on the server with no client JS.
export default function PlacementBadge({
  place,
  size = 52,
}: {
  place: Place;
  size?: number;
}) {
  const c = TONE[place];
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 48 60"
      role="img"
      aria-label={`${ORDINAL[place]} place`}
    >
      <path d="M17 38 L11 58 L20 51 L24 57 Z" fill={c.dark} />
      <path d="M31 38 L37 58 L28 51 L24 57 Z" fill={c.main} />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return (
          <circle
            key={i}
            cx={24 + 17 * Math.cos(a)}
            cy={24 + 17 * Math.sin(a)}
            r={4.4}
            fill={c.main}
          />
        );
      })}
      <circle cx="24" cy="24" r="17" fill={c.main} />
      <circle cx="24" cy="24" r="13" fill="none" stroke={c.dark} strokeWidth="1.3" />
      <text
        x="24"
        y="25"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-mono), monospace"
        fontWeight="700"
        fontSize="9"
        letterSpacing="0.5"
        fill={c.text}
      >
        {ORDINAL[place]}
      </text>
    </svg>
  );
}
