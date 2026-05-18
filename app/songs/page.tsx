import Link from "next/link";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";
import WBStamp from "@/components/waybill/WBStamp";

export default function SongsPage() {
  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto">
      <WBLetterhead subtitle="Loading Sheet" code="Form W/SNG" />
      <div
        style={{
          padding: "32px 18px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <WBLabel>Cargo of the night</WBLabel>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            marginTop: 6,
          }}
        >
          Songs &amp; jukebox
          <br />
          coming soon.
        </div>
        <div style={{ marginTop: 18 }}>
          <WBStamp color="#384a2f" rotate={-4}>
            En Route
          </WBStamp>
        </div>
        <Link
          href="/feed"
          style={{
            marginTop: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            color: "var(--color-blue-deep)",
            fontWeight: 700,
          }}
        >
          ← BACK TO MANIFEST
        </Link>
      </div>
    </main>
  );
}
