-- 030_warlock_invocations.sql
-- Wave 4 — Warlock Eldritch Invocations.
--
-- Warlocks pick invocations at level 2+, scaling with class level. Most are
-- passive flags (Agonizing Blast, Devil's Sight, etc.); a few unlock new
-- mechanics — Book of Ancient Secrets grants ritual casting.
--
-- Stored as a TEXT[] of invocation keys (e.g. 'agonizing_blast',
-- 'book_of_ancient_secrets', 'devils_sight').

ALTER TABLE characters ADD COLUMN IF NOT EXISTS warlock_invocations TEXT[] DEFAULT '{}'::text[];
