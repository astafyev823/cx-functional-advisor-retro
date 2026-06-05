-- Migration 006 — apply against the existing Supabase project.
-- Paste into https://supabase.com/dashboard/project/sdjbfxwakuexwiiukklf/sql/new
-- and run. Idempotent (re-runnable).
--
-- Page 4 BAU restructure: replaces drag/drop sort with 5 hardcoded
-- future-state options that have reactions + comments.
--
-- Two changes:
--   1. New table: bau_option_comments (one row per posted comment on
--      one of the 5 hardcoded options). option_id is a text slug
--      ('bau-option-1' .. 'bau-option-5') — the option text itself
--      lives only in the page code.
--   2. Reactions on these options reuse the existing reactions table.
--      reactions.entry_type CHECK is widened to include 'bau_option'.
--      reactions.entry_id is uuid — page code uses 5 stable hardcoded
--      UUIDs (no FK; entry_id is a logical pointer).

-- =====================================================================
-- 1. bau_option_comments
-- =====================================================================

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

alter table public.bau_option_comments replica identity full;

-- RLS — permissive anon policies, matching every other table in this app.
alter table public.bau_option_comments enable row level security;
drop policy if exists "anon read"   on public.bau_option_comments;
drop policy if exists "anon insert" on public.bau_option_comments;
drop policy if exists "anon update" on public.bau_option_comments;
drop policy if exists "anon delete" on public.bau_option_comments;
create policy "anon read"   on public.bau_option_comments for select to anon using (true);
create policy "anon insert" on public.bau_option_comments for insert to anon with check (true);
create policy "anon update" on public.bau_option_comments for update to anon using (true) with check (true);
create policy "anon delete" on public.bau_option_comments for delete to anon using (true);

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bau_option_comments'
  ) then
    alter publication supabase_realtime add table public.bau_option_comments;
  end if;
end$$;

-- =====================================================================
-- 2. reactions.entry_type — add 'bau_option'
-- =====================================================================

alter table public.reactions drop constraint if exists reactions_entry_type_check;
alter table public.reactions
  add constraint reactions_entry_type_check
  check (entry_type in (
    'proud_moment','success_def','retro_card',
    'commitment','org_pin','bolder_trigger','bau_option'
  ));
