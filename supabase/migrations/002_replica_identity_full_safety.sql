-- Migration 002 — apply against the existing Supabase project.
-- Paste into https://supabase.com/dashboard/project/sdjbfxwakuexwiiukklf/sql/new
-- and run. Idempotent.
--
-- Safety net for two tables that gain UPDATE traffic in Phase 2 batch 3:
--   - commitments (Page 3 supports edit-by-author, so UPDATE events fire)
--   - bau_criteria (Page 4 last-write-wins jsonb, UPDATE on every drag)
--
-- Neither is strictly REQUIRED:
--   - commitments' client state is keyed by `id` (the PK), UPDATE payload.new
--     carries the full row, DELETE payload.old has the PK. Default replica
--     identity is sufficient.
--   - bau_criteria has one row per session, keyed by `session_id` (the PK).
--     UPDATE payload.new has the full criteria jsonb. Same story.
--
-- But Mina asked for FULL on both as belt-and-braces — it costs nothing on
-- workshop-scale tables and protects against any future client state
-- refactor that might key by a non-PK column.

alter table public.commitments  replica identity full;
alter table public.bau_criteria replica identity full;
