-- Migration 001 — apply against the existing Supabase project.
-- Paste into https://supabase.com/dashboard/project/sdjbfxwakuexwiiukklf/sql/new
-- and run. Idempotent.
--
-- Bug: reaction DELETE events were arriving in the client with only
-- `id` in payload.old (the default REPLICA IDENTITY = PRIMARY KEY).
-- Our ReactionMap is keyed by entry_id / kind / participant_id, none
-- of which are the PK, so the DELETE handler couldn't find the
-- reaction to remove and the toggle-off was invisible to other clients.
--
-- REPLICA IDENTITY FULL makes Postgres include every column from the
-- old row in WAL output, which Supabase realtime forwards verbatim.
-- This is already in schema.sql for future re-runs; this file is just
-- so we don't have to re-apply the whole schema.

alter table public.reactions replica identity full;
