-- Migration 003 — apply against the existing Supabase project.
-- Paste into https://supabase.com/dashboard/project/sdjbfxwakuexwiiukklf/sql/new
-- and run. Idempotent (re-runnable).
--
-- Phase 2 batch 4 (Pages 5 + 6).
--
-- Two changes:
--   1. Reshape readiness_signals from PER-PARTICIPANT to ROOM-WIDE.
--   2. REPLICA IDENTITY FULL on the three tables that gain UPDATE traffic.

-- =====================================================================
-- 1. readiness_signals: per-participant → room-wide
--
-- Per Mina's deviation on Page 6: the three top-of-page readiness signals
-- (s1 / s2 / s3) are now a single shared value per session, not one row
-- per participant. Whoever clicks most recently sets the color for
-- everyone (last-write-wins, like bau_criteria).
--
-- The original PK was (session_id, participant_id, signal_key). The new
-- PK is (session_id, signal_key). Page 6 has only ever shipped as a
-- placeholder, so the table is empty in every environment — safe to
-- destructively reshape.
-- =====================================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'readiness_signals'
      and column_name  = 'participant_id'
  ) then
    -- Wipe any stray rows so the new PK can be created without conflicts.
    delete from public.readiness_signals;
    alter table public.readiness_signals drop constraint readiness_signals_pkey;
    alter table public.readiness_signals drop column participant_id;
    alter table public.readiness_signals add primary key (session_id, signal_key);
  end if;
end$$;

-- =====================================================================
-- 2. REPLICA IDENTITY FULL on the new tables that take UPDATE traffic.
--
-- Consistent with migration 002 (commitments / bau_criteria). Belt-and-
-- braces — default replica identity is sufficient when client state is
-- keyed by the PK and the PK is in every event's old payload, but FULL
-- costs nothing on workshop-scale tables and protects future refactors.
--
--   - readiness_signals: every click is an UPSERT or DELETE — single
--     room-wide row per (session, signal).
--   - org_pins: drag/drop updates `month` on the same row.
--   - bolder_triggers: no UPDATE in the spec, included for consistency.
-- =====================================================================

alter table public.readiness_signals replica identity full;
alter table public.org_pins          replica identity full;
alter table public.bolder_triggers   replica identity full;
