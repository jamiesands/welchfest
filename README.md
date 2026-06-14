# Welchfest

A read-only public memento of **Welchfest** — the Welch Group summer party on
13 June 2026. The day's live, interactive PWA has been converted into a
keepsake site that stays up for desktop and mobile visitors. All party data is
frozen in Supabase; the public never writes.

## Pages

- `/` — landing / hero
- `/photos` — guest photo gallery (lightbox, Supabase render thumbnails)
- `/awards` — Best Truck results, grouped by fleet, with judged rosettes
- `/designs` — Design a Lorry gallery, winner highlighted
- `/leaderboard` — penalty-shootout standings (hidden until it has rows)

## Admin

Behind the existing auth (a soft passphrase gate on the UI, plus the moderator
cookie set at `/moderate/login` that `proxy.ts` enforces on every
`/api/admin/*` write):

- `/admin/trucks` — set truck placements (1/2/3) per fleet, vote tally shown
- `/admin/designs` — pick the single winning lorry design
- `/admin/leaderboard` — add / edit / delete penalty-shootout scores
- `/moderate` — hide a photo from the public gallery after the fact

Winner and leaderboard changes trigger on-demand revalidation so the public
pages update immediately.

## Rendering

Public pages are static (ISR, `revalidate = 3600`) and re-validate on demand
from the admin actions. Reads use the Supabase **anon** key; admin writes use
the **service role** key, server-side only.

## Develop

```bash
pnpm install
cp .env.example .env.local   # fill in the Supabase + auth values
pnpm dev
```

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS · Supabase
(`welchfest` schema, project `virybnhjigtupuiwveke`). Deployed on Vercel at
`welchfest.welchgroup.co.uk`.
