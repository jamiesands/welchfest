import WelchMark from "./WelchMark";
import WBLabel from "./WBLabel";

type Props = {
  subtitle?: string;
  code?: string;
  date?: string;
};

export default function WBLetterhead({
  subtitle = "Dispatch Note",
  code = "Form W/MEM-26",
  date = "13·06·26",
}: Props) {
  return (
    <div
      style={{
        padding: "12px 18px 10px",
        borderBottom: "1.5px solid var(--color-ink)",
        background: "var(--color-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <WelchMark size={26} mode="real" />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 9.5,
              letterSpacing: "0.32em",
              color: "var(--color-ink)",
              marginBottom: 2,
            }}
          >
            WELCH GROUP · EST. 1934
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 19,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            {subtitle}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <WBLabel>{code}</WBLabel>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              marginTop: 2,
            }}
          >
            {date}
          </div>
        </div>
      </div>
    </div>
  );
}
