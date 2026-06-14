import Link from "next/link";
import WelchMark from "@/components/waybill/WelchMark";

// Top-of-page letterhead for the public memento. Mirrors the waybill
// WBLetterhead used on the admin/moderate screens, but spans the full width
// and centres its contents in the shared max-width container so it reads well
// on a desktop monitor as well as a phone.
export default function SiteHeader() {
  return (
    <header className="border-b border-ink bg-card">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <WelchMark size={30} mode="real" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] font-bold tracking-[0.3em] text-ink">
            WELCH GROUP · EST. 1934
          </div>
          <Link
            href="/"
            className="block font-sans text-2xl font-bold leading-none tracking-tight sm:text-3xl"
          >
            WELCHFEST
          </Link>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-faded">
            Form W/MEM-26
          </div>
          <div className="font-mono text-[11px] sm:text-xs">13·06·26</div>
        </div>
      </div>
    </header>
  );
}
