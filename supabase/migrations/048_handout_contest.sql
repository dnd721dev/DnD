-- 048_handout_contest.sql
-- DM handouts can be revealed to a single player — the winner of a skill
-- contest (highest roll of a GM-selected check). revealed_to holds the
-- wallets that may see the handout even while `revealed` (to all) is false.

ALTER TABLE session_handouts
  ADD COLUMN IF NOT EXISTS revealed_to TEXT[] NOT NULL DEFAULT '{}';
