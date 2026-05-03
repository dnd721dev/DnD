# Chat Bug Report
_Generated after full audit of all chat-related files. All bugs confirmed from
source code and migrations — no speculation._

---

## BUG 1 — CRITICAL: Whisper messages are visible to everyone

**Issue:** Any session participant can read whisper messages not addressed to them.

**Root cause:**
`022_combat_persistence.sql` (lines 56-64) adds a second SELECT policy on
`session_messages`:
```sql
CREATE POLICY "session_messages_select_open"
  ON session_messages FOR SELECT USING (true);
```
PostgreSQL ORs multiple SELECT policies together. The correct whisper-filtering
policy from `002_rebuild_backend.sql` (`session_messages_select`, lines 522-530)
becomes irrelevant because `(any_check) OR true` is always `true`. Every wallet
can read every row in `session_messages`, including whispers.

Additionally, the initial message load in `TableChat.tsx` (lines 113-120) does not
client-side filter whispers — it returns all 80 messages. The realtime handler
(lines 138-141) does client-side filter, but only for newly delivered messages.
So even if the DB-side RLS were fixed, existing whispers in the initial load would
be unfiltered on the client.

**Fix:**
1. Migration: `DROP POLICY IF EXISTS "session_messages_select_open" ON session_messages;`
   The policy from 002 is correct and complete — it just needs the 022 policy gone.
2. `TableChat.tsx` initial load: add the same client-side whisper filter that the
   realtime handler already has:
   ```ts
   setMessages((data ?? []).filter(m => {
     if (m.kind !== 'whisper') return true
     if (m.sender_wallet === myWallet) return true
     if (m.whisper_to === myWallet) return true
     return false  // TODO: GM bypass handled server-side; not needed client-side
   }) as Message[])
   ```

**Priority:** CRITICAL

---

## BUG 2 — CRITICAL: Whisper dropdown always empty ("No other players connected")

**Issue:** The whisper 🤫 toggle can be clicked but the recipient dropdown always
shows "No other players connected", so it is impossible to address a whisper to
anyone.

**Root cause:**
`TableChat.tsx` lines 49-53 attempt a PostgREST embedded-resource join:
```ts
supabase
  .from('session_players')
  .select('wallet_address, profiles(display_name, username, avatar_url)')
  .eq('session_id', sessionId)
```
PostgREST only follows declared foreign-key relationships. The `session_players`
table (`007_add_missing_tables.sql` lines 51-71) has NO foreign key from
`wallet_address` to `profiles.wallet_address`. The query fails with a PostgREST
relationship error.

The error handler at line 54 is `if (error) return`, so `loadParticipants` exits
immediately, leaving `participants = []` and `avatarMap = {}`.

The GM entry (fetched separately at lines 72-90) is the only participant that can
be populated — but only if the sender is not the GM. Players canot whisper to other
players at all.

**Fix (two parts):**

Part A — add the missing FK in a migration:
```sql
ALTER TABLE session_players
  ADD CONSTRAINT fk_session_players_profile
    FOREIGN KEY (wallet_address) REFERENCES profiles(wallet_address)
    ON DELETE CASCADE NOT VALID;
```
This lets PostgREST resolve the join. `NOT VALID` avoids a full table scan on
existing rows.

Part B — also join to `characters` for the NFT avatar (needed for Bug 3):
```ts
supabase
  .from('session_players')
  .select('wallet_address, characters(name, avatar_url)')
  .eq('session_id', sessionId)
```
`session_players.character_id` already has a proper FK to `characters(id)`, so
this join works today. Profiles can be fetched in a second query or via the FK
added in Part A.

**Priority:** CRITICAL

---

## BUG 3 — HIGH: NFT avatar (PFP) never shown in chat messages

**Issue:** Chat message bubbles show the initial-letter fallback for all users
instead of their NFT character portrait.

**Root cause:**
`TableChat.tsx` builds the avatar cache from `profiles.avatar_url` (via the
failing join, or directly for GM / sender). The NFT image URL is stored in
`characters.avatar_url` — a completely separate column that is populated during
character creation (step 1 extracts `metadata.image` from OpenSea; step 6 saves it
to the `characters` row). `profiles.avatar_url` is only set when a user manually
edits their profile; for almost all users it is `null`.

The correct data source is `characters.avatar_url` reached via
`session_players.character_id → characters.avatar_url`.

**Two compounding causes:**
1. The `session_players → profiles` join fails (Bug 2), so avatarMap is never
   populated.
2. Even if the join were fixed, the wrong column is targeted (`profiles.avatar_url`
   instead of `characters.avatar_url`).

**Fix:**
Change the participant query to reach `characters.avatar_url` through the working FK:
```ts
const { data: playerRows, error } = await supabase
  .from('session_players')
  .select('wallet_address, character_id, characters(name, avatar_url)')
  .eq('session_id', sessionId)

// ...
const avatarUrl =
  (row.characters as any)?.avatar_url ??   // NFT image — preferred
  null

if (avatarUrl) newAvatarMap[wallet] = avatarUrl
```

Additionally, for the GM entry (fetched separately), also query the GM's character
via `session_players` or directly from `characters.wallet_address = gmWallet` to
get their NFT avatar.

**Priority:** HIGH

---

## BUG 4 — HIGH: Missing FK causes silent query failure on every chat load

**Issue:** Every time `TableChat` mounts, the participant query silently fails and
the component continues with empty state. There is no error shown to the user and
the failure is difficult to debug in production.

**Root cause:**
`session_players.wallet_address` (TEXT) has no FK constraint to
`profiles.wallet_address` (TEXT PRIMARY KEY). PostgREST requires an FK to perform
an embedded resource join using the `table(col)` syntax. Without it the query
returns a 400 error with body `"Could not find a relationship between ..."`.

This is a schema gap: `007_add_missing_tables.sql` creates `session_players` but
does not declare the relationship to `profiles`.

**Fix:**
New migration file `023_session_players_profile_fk.sql`:
```sql
-- Add FK so PostgREST can join session_players → profiles
ALTER TABLE session_players
  ADD CONSTRAINT fk_session_players_profile
    FOREIGN KEY (wallet_address) REFERENCES profiles(wallet_address)
    ON DELETE CASCADE NOT VALID;
```

Note: `profiles` uses `wallet_address` as its PRIMARY KEY, so this FK is valid
once the constraint is added. `NOT VALID` prevents a full-table scan on existing
rows when the migration runs.

**Priority:** HIGH

---

## BUG 5 — MEDIUM: Initial chat load doesn't client-side filter whispers

**Issue:** Even after Bug 1's RLS is fixed at the DB level, the initial message
load (`TableChat.tsx` lines 113-120) fetches up to 80 rows and sets them all into
state with no client-side whisper filter. A non-recipient could receive a whisper
in the initial payload if the RLS were misconfigured again (or via a future
regression), and they would see it.

The realtime handler (lines 138-141) already has the correct client-side filter:
```ts
if (msg.kind === 'whisper' && myWallet) {
  if (msg.sender_wallet !== myWallet && msg.whisper_to !== myWallet) return
}
```
The initial load does not have an equivalent.

**Fix:**
After the load query, filter before calling `setMessages`:
```ts
const allMessages = (data ?? []) as Message[]
const visible = myWallet
  ? allMessages.filter(m =>
      m.kind !== 'whisper' ||
      m.sender_wallet === myWallet ||
      m.whisper_to === myWallet
    )
  : allMessages.filter(m => m.kind !== 'whisper')
setMessages(visible)
```

**Priority:** MEDIUM

---

## BUG 6 — MEDIUM: No realtime update of whisper recipient list when new player joins

**Issue:** If a player joins the session after the chat component has mounted, they
do not appear in the whisper dropdown without a page refresh.

**Root cause:**
`loadParticipants` runs once on mount. There is no realtime subscription on
`session_players` inside `TableChat`. The table IS in the realtime publication
(added by migration 011), but `TableChat` never subscribes to it.

**Fix:**
Add a subscription inside the same `useEffect` that loads participants:
```ts
const channel = supabase
  .channel(`session-players-${sessionId}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'session_players',
      filter: `session_id=eq.${sessionId}` },
    () => { void loadParticipants() }  // re-run full participant load on any change
  )
  .subscribe()
return () => supabase.removeChannel(channel)
```
A full re-run on change is simpler and correct since participant list is small.

**Priority:** MEDIUM

---

## BUG 7 — LOW: 022_combat_persistence.sql creates a conflicting/incomplete session_messages definition

**Issue:** Migration 022 contains `CREATE TABLE IF NOT EXISTS public.session_messages`
with a schema that omits `whisper_to` and `metadata`, and lists only three `kind`
values (no 'whisper'). If migration 002 has already run the CREATE is a no-op, but
the intent of 022 conflicts with 002 and is misleading. If 002 were ever rolled
back and 022 ran alone, whisper messaging would be schema-broken.

**Root cause:** 022 was written as if `session_messages` had never been created,
duplicating its definition with fewer columns.

**Fix:**
Remove the `CREATE TABLE IF NOT EXISTS session_messages` block from 022. It belongs
entirely in 002. Keep only the realtime publication addition:
```sql
-- In 022: remove the CREATE TABLE block and the two CREATE POLICY blocks.
-- Keep only:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='session_messages')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE session_messages; END IF;
END $$;
```

**Priority:** LOW

---

## Priority summary

| # | Priority | Title |
|---|----------|-------|
| 1 | CRITICAL | Open SELECT policy in 022 makes whispers public |
| 2 | CRITICAL | Missing FK from session_players → profiles causes empty whisper dropdown |
| 3 | HIGH     | NFT avatar never shown — wrong column targeted (profiles vs characters) |
| 4 | HIGH     | Missing FK — silent query failure on every chat load |
| 5 | MEDIUM   | Initial load not client-side filtered for whispers |
| 6 | MEDIUM   | No realtime update of whisper dropdown on new participant |
| 7 | LOW      | 022 contains conflicting/incomplete session_messages definition |

---

## Fix implementation order

1. **Migration 023** — add FK + drop open policy (fixes Bugs 1, 2, 4 at the DB level)
2. **TableChat.tsx** — fix avatar source + fix initial load filter + fix participant
   query (fixes Bugs 3, 5, 6)
3. **022 cleanup** (optional/cosmetic — fixes Bug 7)
