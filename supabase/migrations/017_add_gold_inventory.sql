-- 017_add_gold_inventory.sql
-- Add five currency columns to the characters table.
-- All default to 0 so existing characters start with no coins.
-- Bug 19 (database portion) — UI wired separately in Group 3.

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS gold      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS silver    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS copper    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS electrum  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platinum  integer NOT NULL DEFAULT 0;
