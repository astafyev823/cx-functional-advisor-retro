# CX Engagement — Build Context

> Read this file at the start of every session before writing code.

## 1. Project summary

A multi-device, real-time web app for a one-day CX Transformation leadership session at the 6-month mark. 6–10 participants join a shared room from their own devices (laptops or phones); every interaction — submitting answers, dragging pins, reacting, voting — appears live on everyone else's screen via Supabase realtime. The visual design, copy, page structure, and interaction patterns are anchored in the reference HTML at `/reference/cx-engagement-app.html`; we're rewriting the data layer (from local memory to Supabase) without changing the UI, with a small number of deliberate deviations (see section 5).

## 2. Tech stack

- Next.js 16 + React 19 (App Router, TypeScript)
- Tailwind CSS v4 (CSS-first `@theme` config, not `tailwind.config.js`)
- Supabase (`@supabase/supabase-js`) for database + realtime
- Framer Motion for animations
- Vercel hosting, GitHub source

## 3. Credentials & links

| Thing | Value |
|---|---|
| GitHub username | `YOUR-USERNAME` |
| GitHub repo | https://github.com/YOUR-USERNAME/cx-engagement |
| Vercel live URL | https://YOUR-APP.vercel.app/ |
| Supabase project URL | https://YOUR-PROJECT.supabase.co |
| Supabase publishable key | `sb_publishable_YOUR_KEY` |
| Local project folder | `C:\Users\Mina.Hoti\cx-engagement` |
| Reference HTML | `/reference/cx-engagement-app.html` |

Env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set both in `.env.local` (gitignored) and in Vercel (Production / Preview / Development).

## 4. Build plan

### Phase 1 — Foundation
- [x] Step 1 — Scaffold Next.js, push to GitHub, deploy to Vercel.
- [x] Step 2 — Schema applied in Supabase. SQL at `supabase/schema.sql`. 16 tables, RLS on, 15 in realtime publication.
- [x] Step 3 — Design tokens + 9 base components.
- [x] Step 4 — Join flow + SessionProvider + realtime participant list. 2-window verified.

### Phase 2 — Pages
- [x] Page 0 — Welcome (agenda, goal, participant list, "Start the session →")
- [x] Page 1 — Celebrate (banner, 3 story modals, proud_moments + reactions, 4 stat modals, success_defs + reactions)
- [x] Page 2 — Health Check + Retro (4 dials with live team-avg + dots, click-to-drop direction pin, 2×3 retro board with per-card reactions)
- [x] Page 3 — Commitments (LIVE synthesis card pulling from Page 2 data, commitment wall with author-edit, reactions)
- [x] Page 4 — BAU (drag-drop criteria across must/nice/risk + tray, last-write-wins jsonb, notes)
- [ ] Page 5 — Org Evolution (5-month timeline with drag-drop pins + notes)
- [ ] Page 6 — Bold to Bolder (3 RAG signals + trigger submissions + notes)
- [ ] Page 7 — Close (no video)
- [ ] Stress test with 6 simultaneous browsers
- [ ] Reset button (deferred — destructive across 15 tables, kicks everyone out, needs its own confirmation UX)

## 5. Where we are right now

Pages 0–4 are all complete and verified across two browser windows. Phase 1 foundation + Phase 2 batches 1, 2, and 3 all shipped. **Next session: Phase 2 batch 4** — Pages 5 + 6 (Org evolution + Bold to bolder), then **batch 5** — Page 7 (Close) + the 6-window stress test.

### Page-by-page implementation history

**Page 0 — Welcome.** Magenta badge, hero "Let's spend a day reflecting" with amber-tinted highlight, navy GOAL card, live participant chip list, two-column morning/afternoon agenda, "Start the session →" once joined. Inline JoinAsNew card appears for users hitting a shared `/r/[code]` URL without identity. Afternoon agenda reordered to match the nav (BAU → Org evolution → Bold to bolder) — a deviation from the reference's BAU → Bold → Org order.

**Page 1 — Celebrate.** Magenta "6 months in!" banner with decorative shapes. Three story tiles (s1 magenta L&D / s2 cobalt FUSE / s3 lavender learning) open detail modals with verbatim copy from `STORIES`. Proud-moments card: realtime input + list with `ReactionBar` per moment. Four stat tiles (4 / 12 / 18 / 50+) open detail modals — the "50+ Jazzicians" tile contains the full names list verbatim. Navy "BIG QUESTION" card with `impact` (amber) and `activity` (magenta) highlights, success-defs input + reactable list. All entries via `useEntries`; all reactions via `useReactions` with `entry_type` = `proud_moment` / `success_def`.

**Page 2 — Health Check + Retro.** The most complex page in the build. Three independent realtime systems on one route:
- **4 dials** in a 2×2 grid (engagement / energy / prioritisation / ways). Component-local draft until submit; after submit the row shows team avg + per-participant colored dots at each submitter's x. `useHealthSubmissions(sessionId)` returns a `Map<participant_id, HealthSubmission>`. Writes are full-row upsert with `onConflict: "session_id,participant_id"` — the same user is the only writer for their row, so reading other columns from local state to fill the upsert is race-safe. Submit / Edit cycle preserves draft so users keep their previous answer through an Edit.
- **Direction pin scatter** in the same card. Click anywhere drops your pin; clicking again moves it (single per-participant row, not append). Pins use `pointerEvents: none` so clicks always land on the scatter background. Pin lives on `health_submissions.pin_x` / `pin_y` (already nullable per ambiguity c), independent of dial submission.
- **Retro board** 2×3 grid (lanes cx/vmo × actions continue/stop/change). Each cell has its own draft + Enter-to-submit. Card reactions reuse `useReactions` with `entry_type: "retro_card"`.

Bug history on Page 2 — important context for future debugging:
- **Reaction toggle-off bug** (resolved): Click ❤️ inserted the row, but clicking again to remove didn't update UI. Two compounding causes — (a) Postgres default `REPLICA IDENTITY` only ships PK columns in `payload.old` on DELETE; my old `ReactionMap` was keyed by `entry_id` / `kind` / `participant_id`, none of which are the PK; (b) the `.match()` filter could miss rows when client state drifted from DB state. Fixed with migration 001 (`ALTER TABLE public.reactions REPLICA IDENTITY FULL`), refactoring `useReactions` to use `Map<row_id, ReactionRow>` as canonical state (idempotent on INSERT, only needs `id` on DELETE), making INSERT/DELETE handlers fully immutable, and using `DELETE WHERE id = <pk>` on toggle-off.
- **Dial dot rendering** (resolved): Submitted-value dots beneath each slider rendered as ovals / inconsistent sizes. Diagnostic logger via `ref` confirmed dots were actually 10x10 in code — the visual artifact was browser-zoom sub-pixel rounding (at 89%/90% zoom, a 1.5px border quantises to ~1.33 device pixels and anti-aliasing differs across dots). Hardened: dots bumped to 12×12, border to 2px (whole-pixel), container 14→16px, `willChange: "transform"` so each dot composites on its own GPU layer (anti-aliasing computed independently of neighbours). All dots same 12px size regardless of owner — a deviation from the reference's 12-for-self / 10-for-others split — with own-dot only differentiated via `zIndex: 2`.

**Page 3 — Commitments.** The big deviation: the "✨ Session synthesis" card replaces the reference's hardcoded AI content with three sub-blocks that pull *live* data from Page 2 via `useMemo`:
1. **PROGRAM HEALTH AT A GLANCE** — 4 dial averages, lowest/highest call-out, "tight consensus" if the worst-spread dial has spread ≤ 22 across submitters / "mixed views — the room isn't aligned on {dial}" otherwise. Fallback: "No health data yet…" when zero submissions.
2. **WHERE THE ROOM PLACED THE PROGRAM** — pin quadrant tallies. Sweet spot = top-right (x ≥ 50, y < 50). First quadrant in the sentence carries pluralized "pin"/"pins"; subsequent quadrants drop it for readability. Fallback: "No pins dropped yet."
3. **WHAT THE RETRO IS SAYING** — top-reacted retro card (heart + like + q weighted equally; earliest `created_at` breaks ties). Only renders reaction-count blocks with count > 0. Fallback: "No reactions on retro cards yet…"

Commitment wall: input form with badge + sentence + textarea + by-when + Commit. Cards in a 2-col grid in author's color tint. **Each card shows an Edit pill only when `currentParticipant.id === commitment.participant_id`** — author-only inline edit form (Save UPDATEs the row in place; reactions are preserved because they live on a different table keyed by commitment id). Migration 002 added `REPLICA IDENTITY FULL` to `commitments` and `bau_criteria` as belt-and-braces (neither strictly required — client state on both keys by the PK and UPDATE payloads carry `payload.new`).

**Page 4 — BAU.** One row per session in `bau_criteria` with a single jsonb `criteria` blob holding `{must, nice, risk, tray}`. Every drag/drop/click-to-tray/×-delete/+add writes the whole blob back — last-write-wins on every change (ambiguity d; acceptable for the workshop's 6–10 people). First Page-4 load for a new session seeds the row with the reference's defaults; race-tolerant on the seed insert (lost-race INSERT returns 23505 = local state already has SEED and the winning row's realtime echo confirms). HTML5 drag/drop with a `useRef` to hold the dragged item; column drop zones outline on dragOver. Clicking an item in a column returns it to the tray. × on hover deletes outright. + add inserts to tray with duplicate-prevention across all four arrays. Notes section at the bottom via the existing `NotesSection` component + `bau_notes` table.

### Deviations from the reference HTML (3 logged today)

1. **Page 2 dot sizing standardised to 12×12** for everyone (no "your own dot is bigger"). The reference uses 12-for-self / 10-for-others; we use 12 across the board with a `zIndex` ownership signal. Triggered by Mina's request after sub-pixel zoom rendering exposed the unevenness.
2. **Page 3 synthesis card fully rebuilt** to pull live data from Page 2 (health averages, pin quadrant tallies, top-reacted retro card). The reference's hardcoded goals/actions/owners are gone — every number on the card is real.
3. **Page 3 commitments are editable by their author.** Reference doesn't allow edits; we add an inline Edit pill visible only to `currentParticipant.id === commitment.participant_id`, with Save UPDATE-in-place (reactions preserved).

(Plus older minor deviations baked in: page-0 afternoon agenda reordered to match nav order; page-2 "60-second pulse" with the reference's "· anonymous" suffix dropped; page-2 health_submissions uses upsert on the composite PK instead of insert-only; per-participant single pin (move-not-append); user-switcher dropdown removed per ambiguity b.)

### Hooks (`hooks/`)

- `useEntries<T>(table, sessionId, orderBy?)` — generic load + realtime subscription for any per-session table. Dedupes by `id` on INSERT, handles UPDATE/DELETE.
- `useReactions(sessionId)` — single subscription for all reactions in the session. Canonical state is `Map<row_id, ReactionRow>`; exposes a derived `Map<entry_id, { kind: participant_id[] }>` via `useMemo` for the `ReactionBar` interface. `toggleReaction(entryType, entryId, participantId, kind)` looks up the row by `(entry, participant, kind)` from canonical state and DELETEs by PK (race-proof) or INSERTs with 23505 swallow.
- `useHealthSubmissions(sessionId)` — `{ submissions: Map<participant_id, HealthSubmission>, loaded }`. Per-participant single row (composite PK), default replica identity is sufficient because PK is in both INSERT/UPDATE/DELETE payloads.
- `useBauCriteria(sessionId)` — single-row hook returning `{ criteria, loaded, updateCriteria }`. Handles seed-on-first-load with race tolerance.

### Routing map

- `/` — join screen
- `/r/[code]` — Welcome (page 0)
- `/r/[code]/celebrate` — Celebrate (page 1)
- `/r/[code]/health` — Health check + Retro (page 2)
- `/r/[code]/commitments` — Commitments (page 3)
- `/r/[code]/bau` — BAU / Transition (page 4)
- `/r/[code]/org` — Org evolution (page 5, placeholder)
- `/r/[code]/bolder` — Bold to bolder (page 6, placeholder)
- `/r/[code]/close` — Close (page 7, placeholder)

### Data-layer map (`lib/`)

- `supabase.ts` — lazy browser singleton client. `getSupabase()`.
- `identity.ts` — `getStoredParticipantId(code)` / `storeParticipantId(code, id)` / `clearStoredParticipantId(code)`. localStorage keyed by uppercased room code.
- `rooms.ts` — `normalizeCode`, `isValidCode`, `findSessionByCode`, `fetchParticipants`, `createParticipant`, `joinOrCreateRoom`, `joinExistingRoom`. Color assignment = `participants.length % 5`; repeats are expected and disambiguated by name + initials.
- `colors.ts` — `COLORS` palette (5 entries, DB `color_idx` maps here — DO NOT reorder), `colorForIdx`, `RAG`, `initials`.
- `pages.ts` — `PAGES` constant (8 entries), `pageHref`, `pageNumFromPath`.

### Provider

`app/components/SessionProvider.tsx` wraps `/r/[code]` and exposes `useSession()` returning `{ status, session, participants, currentParticipant, setCurrentParticipant }`. Status is `"loading" | "not-found" | "loaded"`.

### Design system map (`app/components/`)

| Component | Purpose |
|---|---|
| `Card` | Standard white panel; `accent` prop adds colored left rail for "question" cards |
| `Eyebrow` | All-caps colored label above headings |
| `PillButton` | Primary / secondary / ghost; accepts `color` override for hero bands |
| `ParticipantBadge` | Initials disc; `size: 'sm' \| 'lg'` |
| `ReactionBar` | Heart / like / question reaction strip; pure presentational |
| `ShapesBg` | Decorative circles/squares/triangles; `density: 'sparse' \| 'full'` |
| `Banner` | Rounded hero band (Celebrate, Close); `background` + `textColor` overrides |
| `NotesSection` | "NOTES & DECISIONS · LIVE" card; takes `notes` + `onSubmit(text)` |
| `Modal` | Backdrop-dismiss modal with Esc + scroll lock |
| `ComingSoon` | Placeholder shell for unbuilt pages, same design system |
| `PageNav` | Sticky top nav with 8 tabs + room code + your badge |
| `PageFooter` | ← Back / Page X of 8 / Next →; smooth-scrolls to top on change |
| `SessionProvider` | Room context + realtime participants subscription |

### Schema cheat-sheet (what's in the DB)

- `sessions(id, code unique, created_by_participant_id)`
- `participants(id, session_id, name, color_idx 0..4)`
- `proud_moments`, `success_defs`, `commitments(what, by_when)`, `bau_notes`, `org_notes`, `bolder_notes`, `final_reflections` — `(id, session_id, participant_id, text, created_at)`
- `health_submissions` PK `(session_id, participant_id)` — engagement/energy/prioritisation/ways nullable until submit; pin_x/pin_y independent (ambiguity c)
- `retro_cards(lane in cx|vmo, action in continue|stop|change, text)`
- `bau_criteria(session_id PK, criteria jsonb)`
- `org_pins(text, month in jul|aug|sep|oct|nov | null)`
- `readiness_signals(session_id, participant_id, signal_key in s1|s2|s3, rating in green|amber|red)`
- `bolder_triggers(text)` — RAG ratings via `reactions`
- `reactions(entry_type, entry_id, participant_id, kind)` — kinds `heart|like|q|green|amber|red`. UNIQUE per `(entry_type, entry_id, participant_id, kind)`. Partial unique index enforces one-of-RAG per participant per trigger.

RLS is ON with permissive anon policies on every table. All UI-driving tables are in the `supabase_realtime` publication. `REPLICA IDENTITY FULL` is set on `reactions` (migration 001), `commitments`, and `bau_criteria` (migration 002).

## 6. Resolved ambiguities — DO NOT re-litigate

These were decided in the kickoff conversation. They are baked into the design.

| # | Topic | Decision |
|---|---|---|
| a | Page navigation | **Independent.** Drop `current_page` from the schema. Each user navigates freely. (A facilitator-nudge feature may be added later.) |
| b | User-switcher dropdown | **Remove.** Each device = one identity. The dropdown from the reference HTML does not exist in the multi-device version. |
| c | Direction pin on health page | **Independent of dial submission.** `pin_x` and `pin_y` are nullable on `health_submissions`. People can drop/move the scatter pin in any order, before or after submitting dials. |
| d | BAU drag-and-drop concurrency | **Last-write-wins** on a single `criteria` jsonb blob is fine for 6–10 people. No item-level rows. |
| e | Bolder trigger RAG ratings | Use the **`reactions` table** with kinds `green / amber / red` keyed by `entry_id` of the trigger entry. The `readiness_signals` table is reserved **only** for the 3 fixed top-of-page signals (`s1`, `s2`, `s3`). |
| f | Facilitator role | **No host flag** for Phase 1. Everyone equal. Reset button restricted to whoever created the room — track via `sessions.created_by_participant_id`. |
| g | Identity persistence | **Stash `participant_id` in `localStorage`** keyed by room code. Refresh keeps the user signed in with the same color. |

## 7. Resume instructions for tomorrow

```powershell
cd $HOME\cx-engagement
claude
```

Then paste this exact message:

> We're continuing the build. Read CONTEXT.md and the reference HTML at /reference/cx-engagement-app.html, check the current project state, and tell me what step we're up to and what's next. Don't write code until I approve.
