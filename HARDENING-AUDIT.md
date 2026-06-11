# Welchfest — Event-Hardening Audit

Audited: 11 June 2026, two days before the event (Sat 13 June, Duxford Depot, 10:30–16:30).
Scope: robustness for live use under patchy network, ~100+ concurrent guests, phone PWA lifecycle.
Branch: `claude/event-hardening`. Every change in Phase 3 traces to a finding ID below.

> Note: the brief says Next.js 15; the repo is actually on **Next 16.2.6** (App Router,
> `proxy.ts` convention). Nothing in this audit depends on the difference, but deploy
> assumptions should use 16.

---

## 1. Map

### Routes

| Route | Kind | Notes |
|---|---|---|
| `/` | client redirect | → `/feed` if `welchfest:guest_id` in localStorage, else `/join` |
| `/join` | guest | inserts `guests` row, stores id in localStorage |
| `/feed` | guest | photo feed, infinite scroll, realtime, UploadSheet modal |
| `/songs` | guest | jukebox queue, request + upvote |
| `/awards` | guest | Best Truck voting, one vote per band |
| `/designs` | guest | Design-a-Lorry upload + gallery |
| `/whats-on` | guest | static agenda, no data |
| `/upload` | redirect | vestigial → `/feed` |
| `/dj` | ops | DJ console; calls `/api/dj/*` |
| `/wall` | ops | big-screen autoscrolling wall |
| `/results` | ops | final tally, manual refresh |
| `/admin`, `/admin/trucks`, `/admin/360` | ops | client-side passphrase (`NEXT_PUBLIC_ADMIN_PASSPHRASE`) |
| `/moderate`, `/moderate/login`, `/moderate/trusted` | ops | gated by `proxy.ts` cookie |
| `/api/dj/{play-next,skip,cue,block,mark-played}` | API | **service-role writes, no auth** (see C1) |
| `/api/admin/trucks`, `/api/admin/trucks/[id]` | API | POST/DELETE trucks, **service-role, no auth** (C1) |
| `/api/moderate/{login,queue,[action]}` | API | gated by proxy cookie (see C2) |

### Supabase (schema `welchfest`)

| Table | Anon can | Written by |
|---|---|---|
| `guests` | SELECT, INSERT | /join |
| `photos` (+`unit_seq`) | SELECT, INSERT | UploadSheet, /admin/360; status updates via service role only |
| `songs` | SELECT, INSERT | /songs; status updates via `/api/dj/*` (service role) |
| `song_votes` | SELECT, INSERT, DELETE | /songs toggle; **PK (song_id, guest_id)** + count trigger |
| `trucks` | SELECT | `/api/admin/trucks` only (service role); `band` generated column |
| `truck_votes` | SELECT, INSERT | /awards; **UNIQUE (guest_id, band)** + count trigger |
| `lorry_designs` | SELECT, INSERT | /designs |

Storage: single public bucket `welchfest-photos` (anon INSERT, public read). Paths:
`{guestId}/*.jpg` (feed), `lorry-designs/*`, `trucks/*`, `360/*`.

### Realtime subscriptions

| Page | Channel | Events |
|---|---|---|
| /feed | `welchfest-photos-feed` | photos INSERT/UPDATE |
| /songs | `welchfest-songs-guest` | songs `*`; song_votes `*` filtered to own guest_id |
| /awards | `welchfest-trucks-vote` | trucks UPDATE/INSERT/DELETE; truck_votes INSERT (own) |
| /designs | `welchfest-designs` | lorry_designs INSERT |
| /dj | `welchfest-songs-dj` | songs `*`, song_votes `*` |
| /wall | `welchfest-wall` | photos INSERT/UPDATE |
| /admin/trucks | `welchfest-trucks-admin` | trucks `*` |

/moderate polls `/api/moderate/queue` every 10 s instead.

**Already solid (no change needed):**
- Vote integrity is constraint-backed in the DB: `song_votes` PK and `truck_votes UNIQUE (guest_id, band)` make double-submits idempotent-ish (second insert fails cleanly); counts are maintained by `SECURITY DEFINER` triggers, not the client. **No new migrations are required.** 
- /awards already does optimistic update **with rollback** and handles `23505` by re-syncing.
- Feed realtime payloads are self-sufficient (guest name/depot denormalised on the row).
- /wall caps its in-memory array at 500 and survives `visibilitychange` in its scroll loop.
- Client-side resize/compress exists (`lib/image.ts`, 2400 px / q0.85) with EXIF orientation handling; 25 MB client-side cap on file pick.
- Direct publish-on-upload is deliberate and is preserved throughout.

---

## 2. Findings

### Critical — will (or easily could) break on the day

**C1 — `/api/dj/*` and `/api/admin/trucks*` are completely unauthenticated.**
- Files: `proxy.ts` (matcher covers only `/moderate`), all routes under `app/api/dj/`, `app/api/admin/`.
- Wrong: every one of these handlers writes with the **service-role** client and performs no auth check. The URLs are guessable.
- On-the-day impact: any guest (or bored teenager) who opens devtools can skip/block every song, mark the whole queue played, insert junk trucks, or `DELETE` the entire Best Truck lineup mid-event. The truck delete is unrecoverable without re-entry.
- Fix: extend the `proxy.ts` gate to `/dj`, `/api/dj/*`, `/api/admin/*`. The login route already whitelists `next=/dj` redirects — gating `/dj` was clearly the original intent.

**C2 — The moderator cookie is a forgeable constant.**
- Files: `proxy.ts:18-19`, `app/api/moderate/login/route.ts:17`.
- Wrong: the gate passes if `welchfest_mod=1`. Anyone can type `document.cookie="welchfest_mod=1"` and walk straight into `/moderate` (and, once C1 is fixed, `/dj`), hiding photos or driving the decks.
- Impact: moderation/DJ controls effectively public to anyone who reads the JS.
- Fix: cookie value becomes a SHA-256 digest derived from `MODERATOR_KEY`; proxy compares against the same digest. No DB, no session store, one env var that must already be set for `/moderate` to work at all.

**C3 — `NEXT_PUBLIC_ADMIN_PASSPHRASE` ships in the client bundle.**
- Files: `app/admin/page.tsx:12`, `app/admin/trucks/page.tsx:17`, `app/admin/360/page.tsx:16`.
- Wrong: a `NEXT_PUBLIC_` var is embedded in the JS sent to every guest; the "passphrase" is extractable in seconds, and the check is only sessionStorage.
- Impact: combined with C1 this made `/admin/trucks` writable by anyone. With C1 fixed, the page gate is cosmetic and the damaging writes are blocked server-side.
- Fix now: gate the **APIs** (C1). The page-level passphrase is left as-is to avoid changing the user's login workflow two days out — see "Too risky" (R1) for the post-event recommendation. (Note: `/admin/360` writes via anon-permitted paths — storage upload + `photos` INSERT — which guests can already do by design, so it gains nothing from a server gate.)

**C4 — No timeout on any network call → permanently stuck UI on patchy 4G.**
- Files: `app/join/page.tsx` (FILING… forever), `components/feed/UploadSheet.tsx` (ADDING… forever), `app/songs/page.tsx`, `app/awards/page.tsx`, `app/designs/page.tsx`, `app/dj/page.tsx`, initial loads everywhere.
- Wrong: supabase-js calls and `fetch`es are awaited with no deadline. A TCP stall on depot-yard 4G leaves buttons disabled indefinitely with no failure state and no retry path; for uploads the guest can't tell if the photo posted.
- Impact: guests stuck on the join screen at 10:30; photos silently lost (guest gives up); DJ console locks up (`busy` never clears).
- Fix: small `withTimeout()` util applied to user-initiated writes and initial loads (10–12 s for queries, 90 s for storage uploads, with copy telling the guest to check the feed before retrying so a late-landing upload doesn't get double-posted); `AbortSignal.timeout` on the /dj fetches. Buttons re-enable, a clear error shows, retry is a tap.

**C5 — HEIC (and any non-web format) can be uploaded raw and renders broken for everyone else.**
- Files: `lib/image.ts:12-18`, `components/feed/UploadSheet.tsx:82-94`, `app/designs/page.tsx:177-193`.
- Wrong: two paths upload the original file untouched: (a) files ≤ 2 MB skip conversion entirely — a 1.8 MB iPhone HEIC goes up as `image/heic`; (b) if `createImageBitmap` refuses the file the code deliberately falls back to the raw blob. The feed, wall and gallery render plain `<img>` tags; HEIC does not render in Chrome/Android or on the big-screen wall.
- Impact: iPhone-majority crowd → a visible fraction of wall tiles are broken images on the night.
- Fix: always route picked files through conversion when they aren't already a web-safe type (jpeg/png/webp/gif); if conversion fails for a non-web type, reject with a clear message instead of uploading something undisplayable. Web-safe originals keep the existing pass-through behaviour.

**C6 — Nothing refetches when the PWA resumes; realtime gaps go unnoticed.**
- Files: `app/feed/page.tsx`, `app/songs/page.tsx`, `app/awards/page.tsx`, `app/designs/page.tsx`, `app/dj/page.tsx`, `app/wall/page.tsx`.
- Wrong: phones background/lock constantly at an outdoor event; iOS kills the WebSocket. supabase-js rejoins the channel on resume, but events missed while suspended are **never replayed**, and no page refetches on `visibilitychange`/`online`. The feed quietly shows 20-minute-old content while claiming to be live.
- Impact: "the app's frozen" complaints all afternoon; DJ console showing a stale queue.
- Fix: tiny shared hook — on document becoming visible or the browser regaining connectivity, re-run the page's existing `fetchAll`/`loadInitial`. (`/moderate` already does exactly this with its visibility-aware poll.)

### Important — degrades the experience

**I1 — Failed initial loads render *misleading empty states* with no retry.**
- Files: `app/feed/page.tsx:307`, `app/awards/page.tsx:198` ("No trucks added yet" if the fetch failed — with 30 real trucks loaded), `app/songs/page.tsx:284`, `app/designs/page.tsx:401`, `app/wall/page.tsx:279`.
- Wrong: every list treats `data.length === 0` as empty, even when the query errored or hasn't returned; errors are swallowed (`if (data) …`). There is also no loading indicator on first paint (blank region).
- Impact: a guest on one bar of signal sees "No trucks added yet" and doesn't vote.
- Fix: track loading / error / ready per page; show "LOADING…" and a "CAN'T REACH THE DEPOT — TAP TO RETRY" failure state in the existing mono empty-state style. Empty copy only shows after a *successful* fetch.

**I2 — /songs optimistic vote toggle never reverts on failure.**
- File: `app/songs/page.tsx:201-230` (`toggleVote` ignores the result of both the insert and delete).
- Impact: offline taps show phantom counts that snap back later; duplicate insert (double-tap/second device) errors invisibly. The DB PK keeps the *data* correct — this is purely a lying-UI problem, but a confusing one.
- Fix: capture errors, revert the optimistic `myVotes`/`votes_count` mutation, treat `23505` as already-voted (keep the vote marked).

**I3 — /dj action fetches can hang and wedge the console.**
- File: `app/dj/page.tsx:95-115` — `busy` is only released when the fetch settles; no timeout.
- Impact: one stalled request disables every button on the operationally-critical console.
- Fix: `AbortSignal.timeout(10_000)` + error flash. (Subset of C4, called out because /dj is night-critical.)

**I4 — UploadSheet can be dismissed mid-upload by a stray backdrop tap.**
- File: `components/feed/UploadSheet.tsx:130` (backdrop `onClick={onClose}`), `:43-45` (Escape).
- Impact: guest taps outside while ADDING…, sheet vanishes, no idea whether the photo posted; may re-upload a duplicate or assume it worked when it didn't.
- Fix: ignore backdrop/Escape dismissal while `submitting` (the ✕ button stays available).

**I5 — Moderation hide/restore fails silently.**
- File: `components/feed/ModerateQueueClient.tsx:48-83` — `if (!res.ok) return;`.
- Impact: on flaky wifi the tap appears to do nothing; moderator can't tell failure from lag.
- Fix: one inline error line ("Action failed — try again") on non-OK/network error, plus a timeout on the fetch.

**I6 — Mod cookie `maxAge` is 24 h.**
- File: `app/api/moderate/login/route.ts:22`.
- Impact: logging in Friday evening to test means re-logging-in mid-event Saturday.
- Fix: bump to 72 h while the login route is being touched for C2.

**I7 — Full-resolution images (~2400 px) are fetched for 64 px thumbnails.** *(recommendation only — no change)*
- Files: `components/feed/EntryRow.tsx`, `app/wall/page.tsx`.
- Impact: heavier 4G usage and slower feed than necessary; mitigated by `loading="lazy"` and the ~1 MB compressed sizes.
- Why not fixed: Supabase image transforms aren't guaranteed on the project's plan, and introducing a thumbnail pipeline two days out is exactly the kind of destabilising change this exercise forbids. Post-event: enable storage image transforms or generate a thumb at upload time.

### Nice-to-have — tidy-up (deliberately untouched unless noted)

- **N1** `components/feed/EntryRow.tsx:17,162-177` — the `pending`/HOLD badge branch is dead under direct-publish (inserts are `status='approved'`, trigger only upgrades). Harmless; left in place ("only where it does not change behaviour" — removing render branches of a shared component two days out fails that bar).
- **N2** `app/upload/page.tsx` — vestigial redirect; left (an old QR/link may point at it).
- **N3** Bottom nav is copy-pasted across five guest pages — a shared component would be nicer; explicitly out of scope (refactor for taste).
- **N4** `app/wall/page.tsx:66` — `trackRef` is set but never read. Harmless.
- **N5** `0001_init.sql` grants `ALL` to anon on all tables; RLS policies are what actually constrain writes, and they're correctly scoped per table. Worth tightening post-event, not now.

---

## 3. Too risky to change now (recommendations, not changes)

| # | What | Why not now |
|---|---|---|
| R1 | Replace the client-side `NEXT_PUBLIC_ADMIN_PASSPHRASE` gate on `/admin/*` pages with the server-side proxy gate | Changes your login workflow on the day; with C1 fixed the damaging writes are already blocked server-side. Post-event: fold `/admin` into the proxy gate and delete the passphrase. |
| R2 | Global fetch timeout on the supabase client (`global.fetch` override) | One knob would also kill slow-but-succeeding photo uploads. Targeted timeouts (C4) are safer. |
| R3 | Offline/persistent upload queue (IndexedDB) so a photo survives an app kill | Real feature work; multi-file, multi-day testing needed. The C4/C5 fixes keep the failure *visible and retryable*, which is enough for one afternoon. |
| R4 | Thumbnail/image-transform pipeline (I7) | New infra dependency two days out. |
| R5 | Adding a service worker for offline shell caching | The PWA is currently manifest-only (no SW). A bad SW cache two days before a one-shot event is a classic foot-gun; guests with a stale cache cannot be told to "clear site data" at a party. |
| R6 | Songs/queue write paths moved behind APIs or RPCs (e.g. atomic `play-next`) | The dual-update in `play-next` (close playing, start next) isn't transactional, but the only writer is one DJ; not worth a refactor now. |

---

## 4. Manual smoke tests (run on the deployed preview before merging)

1. **Join:** fresh private window → `/join` → name + depot + consent → lands on `/feed`. Then: DevTools → Network → Offline → try to join → button re-enables with a clear error within ~12 s; back online → retry succeeds.
2. **Upload on a throttled connection:** DevTools → "Slow 3G" → `/feed` → + ADD PHOTO → pick a large photo → expect ADDING… for a while but **either** success (sheet closes, photo at top) **or** a visible error with the file still selected; backdrop tap during ADDING… must NOT close the sheet. On an iPhone: pick a HEIC photo → it must arrive as JPEG (check the wall renders it on a laptop/Chrome).
3. **Double-vote race (awards):** `/awards` → tap VOTE on two different trucks in the *same band* as fast as possible (or two tabs, same localStorage guest) → exactly one vote recorded, UI ends consistent ("VOTE CAST", one stamped row), count correct after refresh.
4. **Song vote spam:** `/songs` → hammer the ↑ on one row across two tabs → count settles at +1 from that guest; no stuck phantom counts after airplane-mode toggle mid-tap.
5. **PWA background/resume:** install to home screen → open `/feed` → lock the phone 2+ min → meanwhile upload a photo from another device → unlock → the new photo appears within a few seconds **without** pull-to-refresh.
6. **Cold loads / empty states:** before any data exists (or with `?` network blocked) load `/feed`, `/songs`, `/awards`, `/designs` → each shows LOADING… then either real content, a true empty message, or the retry state — never a blank screen, never a wrong "nothing here yet".
7. **Ops auth:** open `/dj` in a private window → redirected to the key login; `document.cookie="welchfest_mod=1"` then `/moderate` → still redirected (forged cookie rejected); log in with `MODERATOR_KEY` → `/dj` and `/moderate` both work; `curl -X POST https://welchfest.uk/api/dj/skip` → 401; `curl -X DELETE https://welchfest.uk/api/admin/trucks/<id>` → 401.
8. **DJ degraded:** on `/dj`, go offline, tap PLAY NEXT → error flash within ~10 s, console buttons re-enable; back online → action works and queue refreshes.

**Deploy prerequisite:** `MODERATOR_KEY` must be set in the Vercel environment (it already must be for `/moderate` to function). After deploying, you'll need to log in once at `/moderate/login` on the DJ device — old `welchfest_mod=1` cookies are invalidated on purpose.
