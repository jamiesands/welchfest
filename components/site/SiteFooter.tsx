import WBPerfBar from "@/components/waybill/WBPerfBar";

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-ink bg-card">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <WBPerfBar />
        <p className="mt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-faded">
          Welch Group · Welchfest · 13 June 2026 · A manifest of memories,
          kept on file.
        </p>
      </div>
    </footer>
  );
}
