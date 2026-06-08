-- 047_maps_public_backfill.sql
-- The user uploaded every map currently in the backend and wants the entire
-- existing library exposed as free public-use maps. Migration 046's
-- `visibility TEXT NOT NULL DEFAULT 'public'` already set every existing row
-- to 'public' when the column was added, but we re-state the intent here for
-- auditability / safety against any manual back-channel changes.

UPDATE maps
   SET visibility = 'public'
 WHERE visibility IS DISTINCT FROM 'public';

-- Optional: attribute every still-unowned (orphaned) map to a single curator
-- wallet so the seeded library has a consistent uploader. Uncomment and
-- replace <user_wallet_lower> with the user's lowercased wallet address
-- before applying. Safe to leave commented — orphans appear in the public
-- library either way; they simply won't show up under "My Private" for anyone.
--
-- UPDATE maps
--    SET owner_wallet = '<user_wallet_lower>'
--  WHERE owner_wallet IS NULL;
