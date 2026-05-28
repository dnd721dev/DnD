-- 031_multiclass_columns.sql
-- Wave 6 — Multiclass support (Option A: 2-class narrow schema).
--
-- 99% of D&D multiclass is 2-class. Option A is additive — existing
-- single-class characters stay unchanged. The combined character level is
-- always derived as `level + COALESCE(secondary_level, 0)`.
--
-- For 3+ class support (rare), this can migrate to a JSONB `classes` array
-- in the future; the schema would still keep `level + secondary_level`
-- compatibility shims.

ALTER TABLE characters ADD COLUMN IF NOT EXISTS secondary_class TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS secondary_subclass TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS secondary_level INT DEFAULT 0;
