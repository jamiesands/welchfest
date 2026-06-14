"use client";

import { useCallback, useEffect, useState } from "react";

export type GalleryItem = {
  id: string;
  thumb: string;
  full: string;
  alt: string;
  /** Bold caption line (photo caption or design name). */
  title?: string | null;
  /** Small supporting lines (guest · depot, unit number, employee). */
  meta?: string[];
  /** Corner ribbon, e.g. "WINNER". */
  badge?: string | null;
  /** Draw an emphasised border (used for the winning design). */
  highlight?: boolean;
};

type Variant = "photos" | "designs";

const GRID: Record<Variant, string> = {
  photos: "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4",
  designs: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4",
};

export default function Gallery({
  items,
  variant = "photos",
}: {
  items: GalleryItem[];
  variant?: Variant;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (dir: number) =>
      setOpen((i) =>
        i === null ? i : (i + dir + items.length) % items.length
      ),
    [items.length]
  );

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, step]);

  const active = open === null ? null : items[open];

  return (
    <>
      <ul className={GRID[variant]}>
        {items.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open ${item.title ?? item.alt}`}
              className={`group relative block w-full overflow-hidden border bg-card text-left shadow-[2px_2px_0_rgba(30,27,22,0.18)] ${
                item.highlight ? "border-blue-deep ring-2 ring-blue-deep" : "border-ink"
              }`}
            >
              <div className="aspect-square overflow-hidden bg-card-deep">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumb}
                  alt={item.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
              </div>
              {item.badge && (
                <span className="absolute right-0 top-2 bg-stamp px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-paper shadow-[2px_2px_0_rgba(30,27,22,0.25)]">
                  {item.badge}
                </span>
              )}
              {(item.title || item.meta?.length) && (
                <div className="border-t border-ink/80 px-2 py-1.5 font-mono">
                  {item.title && (
                    <div className="truncate text-[12px] font-bold text-ink">
                      {item.title}
                    </div>
                  )}
                  {item.meta?.map((line, j) => (
                    <div
                      key={j}
                      className="truncate text-[10px] tracking-[0.06em] text-faded"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title ?? active.alt}
          onClick={close}
          className="fixed inset-0 z-[100] flex flex-col bg-[rgba(20,18,14,0.94)]"
        >
          <div className="flex shrink-0 items-center justify-between px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-paper sm:px-6">
            <span className="truncate pr-3">
              {active.title ?? active.alt}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="shrink-0 border border-paper px-3 py-1 text-base leading-none text-paper"
            >
              ✕
            </button>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous"
                className="absolute left-1 z-10 border border-paper/70 bg-black/30 px-3 py-2 font-mono text-paper sm:left-3"
              >
                ‹
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.full}
              alt={active.alt}
              className="max-h-full max-w-full object-contain"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next"
                className="absolute right-1 z-10 border border-paper/70 bg-black/30 px-3 py-2 font-mono text-paper sm:right-3"
              >
                ›
              </button>
            )}
          </div>

          <div
            className="shrink-0 px-4 py-3 font-mono text-[11px] tracking-[0.1em] text-paper/70 sm:px-6"
            onClick={(e) => e.stopPropagation()}
          >
            {active.badge && (
              <span className="mr-2 bg-stamp px-2 py-0.5 font-bold uppercase tracking-[0.16em] text-paper">
                {active.badge}
              </span>
            )}
            {active.meta?.join(" · ")}
          </div>
        </div>
      )}
    </>
  );
}
