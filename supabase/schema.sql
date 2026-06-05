-- =====================================================================
-- CX Engagement — Supabase schema
-- Phase 1 Step 2. Apply via the Supabase SQL editor:
--   https://supabase.com/dashboard/project/sdjbfxwakuexwiiukklf/sql/new
--
-- Idempotent and re-runnable. Wipes nothing on existing data unless
-- you uncomment the RESET block below.
-- =====================================================================

-- -- RESET (uncomment to wipe and rebuild — destroys all session data)
-- drop table if exists public.reactions             cascade;
-- drop table if exists public.final_reflections     cascade;
-- drop table if exists public.bolder_notes          cascade;
-- drop table if exists public.bolder_triggers       cascade;
-- drop table if exists public.readiness_signals     cascade;
-- drop table if exists public.org_notes             cascade;
-- drop table if exists public.org_pins              cascade;
-- drop table if exists public.bau_notes             cascade;
-- drop table if exists public.bau_criteria          cascade;
-- drop table if exists public.commitments           cascade;
-- drop table if exists public.retro_cards           cascade;
-- drop table if exists public.health_submissions    cascade;
-- drop table if exists public.success_defs          cascade;
-- drop table if exists public.proud_moments         cascade;
-- drop table if exists public.participants          cascade;
-- drop table if exists public.sessions              cascade;

-- =====================================================================
-- Extensions
-- =====================================================================
create extension if not exists pgcrypto;  -- gen_random_uuid()

-- =====================================================================
-- Core tables: sessions & participants
-- =====================================================================

-- A session = one workshop room. Joined by short human-friendly `code`.
create table if not exists public.sessions (
  id                          uuid primary key default gen_random_uuid(),
  code                        text not null unique,
  created_at                  timestamptz not null default now(),
  -- The participant who created the room. Nullable until the first join
  -- writes it. Used to gate the reset button (app-layer enforcement —
  -- there's no auth, so this is best-effort, not a hard security boundary).
  created_by_participant_id   uuid
);

-- One row per device-identity in a session. Color is stored as an index
-- (0..4) into the client-side COLORS palette to avoid duplicating hex/tint.
create table if not exists public.participants (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  name        text not null,
  color_idx   smallint not null check (color_idx between 0 and 4),
  joined_at   timestamptz not null default now()
);

create index if not exists participants_session_idx on public.participants(session_id);

-- Now that participants exists, add the FK for sessions.created_by_participant_id.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sessions_created_by_fk'
  ) then
    alter table public.sessions
      add constraint sessions_created_by_fk
      foreign key (created_by_participant_id)
      references public.participants(id)
      on delete set null;
  end if;
end$$;

-- =====================================================================
-- Page 1 — Celebrate
-- =====================================================================

create table if not exists public.proud_moments (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists proud_moments_session_idx on public.proud_moments(session_id);

create table if not exists public.success_defs (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists success_defs_session_idx on public.success_defs(session_id);

-- =====================================================================
-- Page 2 — Health check + Retro
--
-- One row per (session, participant). All four dials are nullable until
-- the participant taps "Submit my answers" — at which point the app sets
-- them atomically with submitted_at = now(). pin_x / pin_y are
-- independent (per resolved ambiguity c): a participant can drop the
-- direction pin before or after submitting dials, in any order.
-- =====================================================================

create table if not exists public.health_submissions (
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  engagement      smallint check (engagement between 0 and 100),
  energy          smallint check (energy between 0 and 100),
  prioritisation  smallint check (prioritisation between 0 and 100),
  ways            smallint check (ways between 0 and 100),
  pin_x           smallint check (pin_x between 0 and 100),
  pin_y           smallint check (pin_y between 0 and 100),
  submitted_at    timestamptz,  -- null until dials are submitted
  updated_at      timestamptz not null default now(),
  primary key (session_id, participant_id)
);

-- Retro board: 2 lanes (cx, vmo) × 3 actions (continue, stop, change).
-- Reference uses combined keys like "cxCont"; we normalize to two columns.
create table if not exists public.retro_cards (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  lane            text not null check (lane in ('cx', 'vmo')),
  action          text not null check (action in ('continue', 'stop', 'change')),
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists retro_cards_session_idx on public.retro_cards(session_id);

-- =====================================================================
-- Page 3 — Commitments
-- =====================================================================

create table if not exists public.commitments (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  what            text not null,
  by_when         text not null default 'end of 2026',  -- free-text date phrase
  created_at      timestamptz not null default now()
);
create index if not exists commitments_session_idx on public.commitments(session_id);

-- =====================================================================
-- Page 4 — BAU criteria + notes
--
-- Per resolved ambiguity d: one jsonb blob per session, last-write-wins.
-- Shape: { must: string[], nice: string[], risk: string[], tray: string[] }
-- Seeded with the reference defaults on first read by the app, not here,
-- so resets are cheap.
-- =====================================================================

create table if not exists public.bau_criteria (
  session_id  uuid primary key references public.sessions(id) on delete cascade,
  criteria    jsonb not null default '{"must":[],"nice":[],"risk":[],"tray":[]}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.bau_notes (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists bau_notes_session_idx on public.bau_notes(session_id);

-- Comments on the 5 hardcoded future-state options shown on Page 4.
-- option_id is a text slug ('bau-option-1' .. 'bau-option-5'); the
-- text of each option lives in the page code, not the DB. Reactions on
-- those same options reuse the `reactions` table with entry_type =
-- 'bau_option' and 5 stable hardcoded UUIDs for entry_id.
create table if not exists public.bau_option_comments (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  option_id       text not null,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists bau_option_comments_session_option_idx
  on public.bau_option_comments(session_id, option_id);

-- =====================================================================
-- Page 5 — Org evolution (timeline pins + notes)
-- =====================================================================

create table if not exists public.org_pins (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  text            text not null,
  month           text check (month is null or month in ('jul','aug','sep','oct','nov','dec','jan')),
  created_at      timestamptz not null default now()
);
create index if not exists org_pins_session_idx on public.org_pins(session_id);

create table if not exists public.org_notes (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists org_notes_session_idx on public.org_notes(session_id);

-- =====================================================================
-- Page 6 — Bold to Bolder
--
-- readiness_signals: ROOM-WIDE RAG for the THREE FIXED top-of-page
-- signals (s1, s2, s3). One row per (session, signal). Last-write-wins —
-- whoever clicks most recently sets the color for everyone. Per resolved
-- ambiguity e, this table is reserved only for those three keys;
-- trigger entry ratings go through `reactions`.
-- =====================================================================

create table if not exists public.readiness_signals (
  session_id      uuid not null references public.sessions(id) on delete cascade,
  signal_key      text not null check (signal_key in ('s1','s2','s3')),
  rating          text not null check (rating in ('green','amber','red')),
  updated_at      timestamptz not null default now(),
  primary key (session_id, signal_key)
);

create table if not exists public.bolder_triggers (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists bolder_triggers_session_idx on public.bolder_triggers(session_id);

create table if not exists public.bolder_notes (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists bolder_notes_session_idx on public.bolder_notes(session_id);

-- =====================================================================
-- Page 7 — Close
-- =====================================================================

create table if not exists public.final_reflections (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists final_reflections_session_idx on public.final_reflections(session_id);

-- =====================================================================
-- Reactions — cross-cutting
--
-- One row per (entry, participant, kind). Toggle = insert/delete.
-- Covers both standard reactions (heart/like/q) and RAG ratings on
-- bolder_trigger entries (green/amber/red), per resolved ambiguity e.
--
-- The app is responsible for ensuring a participant has at most ONE
-- of {green, amber, red} per trigger entry (delete the others before
-- inserting the new one). Postgres can't express that constraint
-- without a partial unique index, which we add below.
-- =====================================================================

create table if not exists public.reactions (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  entry_type      text not null check (entry_type in (
                    'proud_moment','success_def','retro_card',
                    'commitment','org_pin','bolder_trigger','bau_option'
                  )),
  entry_id        uuid not null,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  kind            text not null check (kind in (
                    'heart','like','q','green','amber','red'
                  )),
  created_at      timestamptz not null default now(),
  unique (entry_type, entry_id, participant_id, kind)
);

create index if not exists reactions_entry_idx   on public.reactions(entry_type, entry_id);
create index if not exists reactions_session_idx on public.reactions(session_id);

-- One RAG rating per participant per trigger entry. Standard reactions
-- (heart/like/q) and RAG (green/amber/red) coexist without conflict
-- because this index only covers the RAG kinds.
create unique index if not exists reactions_one_rag_per_trigger
  on public.reactions (entry_id, participant_id)
  where kind in ('green','amber','red');

-- Realtime DELETE events default to shipping only PK columns in the old
-- payload. The client-side ReactionMap is keyed by entry_id / kind /
-- participant_id, none of which are the PK — so we need every column in
-- the old payload to locate the removed row. REPLICA IDENTITY FULL does
-- exactly that. Cheap for a workshop-scale table.
alter table public.reactions replica identity full;

-- Safety net for tables that gain UPDATE traffic in Phase 2:
--   - commitments: Page 3 supports edit-by-author
--   - bau_criteria: Page 4 last-write-wins jsonb on every drag
--   - readiness_signals: Page 6 room-wide RAG, upsert on every click
--   - org_pins: Page 5 drag/drop updates month on the same row
--   - bolder_triggers: no UPDATE in spec, included for consistency
-- Most are not strictly required (client state keys by the PK), but
-- cheap belt-and-braces for any future refactor.
alter table public.commitments          replica identity full;
alter table public.bau_criteria         replica identity full;
alter table public.bau_option_comments  replica identity full;
alter table public.readiness_signals    replica identity full;
alter table public.org_pins             replica identity full;
alter table public.bolder_triggers      replica identity full;

-- =====================================================================
-- Row Level Security
--
-- Posture: RLS ON with permissive policies for the `anon` role. There is
-- no auth in Phase 1; identity is a `participant_id` stashed in
-- localStorage (per resolved ambiguity g). The publishable key (anon)
-- is what every client uses. Permissive policies are appropriate for a
-- one-day workshop — the data is ephemeral and non-sensitive.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'sessions','participants',
    'proud_moments','success_defs',
    'health_submissions','retro_cards',
    'commitments',
    'bau_criteria','bau_notes','bau_option_comments',
    'org_pins','org_notes',
    'readiness_signals','bolder_triggers','bolder_notes',
    'final_reflections',
    'reactions'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format($p$
      drop policy if exists "anon read"   on public.%I;
      drop policy if exists "anon insert" on public.%I;
      drop policy if exists "anon update" on public.%I;
      drop policy if exists "anon delete" on public.%I;
    $p$, t, t, t, t);

    execute format($p$create policy "anon read"   on public.%I for select using (true)$p$, t);
    execute format($p$create policy "anon insert" on public.%I for insert with check (true)$p$, t);
    execute format($p$create policy "anon update" on public.%I for update using (true) with check (true)$p$, t);
    execute format($p$create policy "anon delete" on public.%I for delete using (true)$p$, t);
  end loop;
end$$;

-- =====================================================================
-- Realtime publication
--
-- Add every table that drives live UI to the supabase_realtime
-- publication so postgres_changes events fire on insert/update/delete.
-- The publication is created by Supabase but may not include our tables
-- yet. `add table` is not idempotent, so wrap in a guard.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'participants',
    'proud_moments','success_defs',
    'health_submissions','retro_cards',
    'commitments',
    'bau_criteria','bau_notes','bau_option_comments',
    'org_pins','org_notes',
    'readiness_signals','bolder_triggers','bolder_notes',
    'final_reflections',
    'reactions'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;

-- =====================================================================
-- Done. Verify with:
--   select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public';
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- =====================================================================
