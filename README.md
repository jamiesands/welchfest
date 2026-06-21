# Welchfest

A read-only public memento of **Welchfest** — the Welch Group summer party on
13 June 2026. The day's live, interactive PWA has been converted into a frozen
keepsake site that stays up for desktop and mobile visitors.

The site is **fully static**: there is no backend, no database and no runtime
image service. Every page is built from a snapshot of the party data committed
to this repo under [`data/`](./data), and every image is a local `webp` under
[`public/images/`](./public/images). Nothing is ever written to it again — no
votes, no uploads, no submissions.

## Pages

- `/` — landing / hero
- `/photos` — guest photo gallery (lightbox)
- `/awards` — Best Truck results, grouped by fleet, with judged rosettes
- `/designs` — Design a Lorry gallery, winner highlighted
- `/leaderboard` — penalty-shootout standings (only appears once it has rows)

## Data & images

Page data lives in `data/*.json`, one file per source table:

| File | Rows | Used by |
| --- | --- | --- |
| `data/photos.json` | approved guest stills | `/photos`, home hero |
| `data/trucks.json` | Best Truck entries | `/awards`, home |
| `data/lorry_designs.json` | Design a Lorry entries | `/designs`, home |
| `data/penalty_shootout.json` | leaderboard scores | `/leaderboard` |

`lib/data.ts` reads these files directly — no network. Image fields in the JSON
already point at local paths such as `/images/photos/unit-004.webp`;
`data/image-manifest.json` records the original `bucket/path → local path`
mapping the snapshot was built from.

## Develop

```bash
pnpm install
pnpm dev
```

No environment variables are required.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS. Deployed on Vercel
at `welchfest.welchgroup.co.uk`.
