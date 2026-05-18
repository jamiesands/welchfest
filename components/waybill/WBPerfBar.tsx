type Props = {
  color?: string;
  opacity?: number;
};

export default function WBPerfBar({ color = "#1e1b16", opacity = 0.4 }: Props) {
  return (
    <svg
      width="100%"
      height="6"
      viewBox="0 0 200 6"
      preserveAspectRatio="none"
      style={{ display: "block", opacity }}
      aria-hidden
    >
      <line
        x1="0"
        y1="3"
        x2="200"
        y2="3"
        stroke={color}
        strokeWidth="1"
        strokeDasharray="3 3"
      />
    </svg>
  );
}
