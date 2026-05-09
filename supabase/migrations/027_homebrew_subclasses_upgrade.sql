-- 027_homebrew_subclasses_upgrade.sql
--
-- Upgrades homebrew_subclasses to match the quality of homebrew_monsters:
--   • Adds is_published (default true) so creators can have drafts
--   • Adds updated_at for optimistic-UI conflict detection
--   • Adds name + published indexes for fast lookups
--   • Replaces the coarse open/own policies with four granular per-operation
--     policies that match the homebrew_monsters pattern exactly.

ALTER TABLE public.homebrew_subclasses
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS homebrew_subclasses_published_idx
  ON homebrew_subclasses(is_published) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS homebrew_subclasses_name_idx
  ON homebrew_subclasses(name);

-- Drop old coarse policies so the migration is idempotent
DROP POLICY IF EXISTS "homebrew_subclasses_open" ON homebrew_subclasses;
DROP POLICY IF EXISTS "homebrew_subclasses_own"  ON homebrew_subclasses;

-- Also drop the new policies before recreating (idempotency)
DROP POLICY IF EXISTS "homebrew_subclasses_select" ON homebrew_subclasses;
DROP POLICY IF EXISTS "homebrew_subclasses_insert" ON homebrew_subclasses;
DROP POLICY IF EXISTS "homebrew_subclasses_update" ON homebrew_subclasses;
DROP POLICY IF EXISTS "homebrew_subclasses_delete" ON homebrew_subclasses;

-- Anyone can read published subclasses, or their own drafts
CREATE POLICY "homebrew_subclasses_select"
  ON homebrew_subclasses FOR SELECT
  USING (
    is_published = true
    OR creator_wallet = lower(
      coalesce(current_setting('request.headers', true)::json->>'x-wallet-address', '')
    )
  );

-- Only the creator can insert
CREATE POLICY "homebrew_subclasses_insert"
  ON homebrew_subclasses FOR INSERT
  WITH CHECK (
    creator_wallet = lower(
      coalesce(current_setting('request.headers', true)::json->>'x-wallet-address', '')
    )
  );

-- Only the creator can update
CREATE POLICY "homebrew_subclasses_update"
  ON homebrew_subclasses FOR UPDATE
  USING (
    creator_wallet = lower(
      coalesce(current_setting('request.headers', true)::json->>'x-wallet-address', '')
    )
  );

-- Only the creator can delete
CREATE POLICY "homebrew_subclasses_delete"
  ON homebrew_subclasses FOR DELETE
  USING (
    creator_wallet = lower(
      coalesce(current_setting('request.headers', true)::json->>'x-wallet-address', '')
    )
  );
