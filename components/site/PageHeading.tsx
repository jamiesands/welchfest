import type { ReactNode } from "react";

type Props = {
  title: string;
  kicker?: string;
  aside?: ReactNode;
  children?: ReactNode;
};

export default function PageHeading({ title, kicker, aside, children }: Props) {
  return (
    <div className="mb-6 border-b border-ink pb-3">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-faded">
        {kicker ?? "Welchfest · 13·06·26"}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-sans text-2xl font-bold leading-none sm:text-3xl">
          {title}
        </h1>
        {aside && (
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-faded">
            {aside}
          </span>
        )}
      </div>
      {children && (
        <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink/80">
          {children}
        </p>
      )}
    </div>
  );
}
