-- Migration 005 — apply against the existing Supabase project.
-- Paste into https://supabase.com/dashboard/project/sdjbfxwakuexwiiukklf/sql/new
-- and run. Idempotent (re-runnable).
--
-- Page 5 timeline expanded from 5 stops (Jul → Nov & beyond) to 7 stops
-- (Jul 2026 → Jan 2027). The original CHECK constraint on org_pins.month
-- only allowed ('jul','aug','sep','oct','nov'); add 'dec' and 'jan'.
--
-- Existing rows with month in the original set are unaffected — the new
-- constraint is a strict superset of the old one.

alter table public.org_pins drop constraint if exists org_pins_month_check;

alter table public.org_pins
  add constraint org_pins_month_check
  check (month is null or month in ('jul','aug','sep','oct','nov','dec','jan'));
