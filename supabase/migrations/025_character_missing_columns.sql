-- 025_character_missing_columns.sql
--
-- Three columns are referenced in step6/page.tsx's save payload but were
-- never added to the characters table, causing a PostgREST schema-cache
-- error ("Could not find the 'X' column") on character save.
--
-- origin_feat             — background-granted origin feat (2024 rules)
-- starting_equipment_choice — 'A' (standard pack) or 'gold' (buy own)
-- starting_gold           — gold pieces rolled/chosen in step5

ALTER TABLE characters ADD COLUMN IF NOT EXISTS origin_feat               TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS starting_equipment_choice TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS starting_gold             INT;
