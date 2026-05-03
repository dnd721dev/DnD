# Chat System Audit
_Files read: TableChat.tsx, PlayerSidebar.tsx, DMPanel.tsx, useSessionCharacters.ts,
useSessionWithCampaign.ts, types.ts, profiles/get/route.ts, profiles/upsert/route.ts,
profiles/by-wallet/route.ts, nft/route.ts, dnd721Token.ts, supabase.ts, supabaseAdmin.ts,
lib/types.ts, types/character.ts, CharacterHeader.tsx, all migrations that reference
session_messages, profiles, characters, session_participants._

---

## SECTION A — Chat message data structure

### A1. Message object fields (current)

`TableChat.tsx` defines:
```ts
type Message = {
  id:           string
  sender_wallet: string
  sender_name:  string
  body:         string
  kind:         'chat' | 'system' | 'whisper'
  whisper_to:   string | null   // wallet address of recipient
  created_at:   string
}
```

There is **no** `sender_avatar`, `character_id`, `token_image_url`, `metadata`,
`message_type`, or `whisper_to_user_id` in the client type or in the DB row.

### A2. Initial message load query

```ts
supabase
  .from('session_messages')
  .select('id, sender_wallet, sender_name, body, kind, whisper_to, created_at')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true })
  .limit(80)
```

- **No JOIN** to any other table.
- **No JOIN** to `characters` for `token_image_url`.
- **No JOIN** to `profiles` for `display_name` or `avatar_url`.
- Avatar data is not in the message row at all.

### A3. Realtime subscription

```ts
supabase
  .channel(`chat-${sessionId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'session_messages',
      filter: `session_id=eq.${sessionId}` },
    (payload) => {
      const msg = payload.new as Message
      // Client-side whisper guard (only for NEW messages, not initial load):
      if (msg.kind === 'whisper' && myWallet) {
        if (msg.sender_wallet !== myWallet && msg.whisper_to !== myWallet) return
      }
      setMessages(prev => [...prev, msg])
    }
  )
  .subscribe()
```

- No secondary fetch for sender avatar or character NFT image.
- The whisper guard fires for realtime-delivered messages only — **not** for the
  initial load query (see Bug 5).

### A4. What is written to session_messages on INSERT

```ts
const row = {
  session_id:    sessionId,
  sender_wallet: senderWallet.toLowerCase(),
  sender_name:   senderName,          // from props — character name or 'Adventurer'
  body,
  kind: whisperMode ? 'whisper' : 'chat',
  whisper_to: whisperMode ? whisperTarget : undefined,
}
```

- **No** `sender_avatar` or `token_image_url` in the INSERT.
- `sender_name` is passed in as a prop from `TableClient → PlayerSidebar → TableChat`
  and typically equals `selectedCharacter?.name ?? undefined`.

### A5. session_messages table schema (from migrations)

**From 002_rebuild_backend.sql (primary definition):**
```
id            UUID        PK
session_id    UUID        NOT NULL → sessions(id) ON DELETE CASCADE
sender_wallet TEXT        NOT NULL
sender_name   TEXT        NOT NULL DEFAULT 'Adventurer'
body          TEXT        NOT NULL
kind          TEXT        NOT NULL DEFAULT 'chat'  -- chat | system | whisper | roll_result
whisper_to    TEXT        (wallet address of whisper recipient)
metadata      JSONB       (structured data for roll_result cards)
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**No** `character_id`, `token_image_url`, `avatar_url`, or `sender_avatar_url` column exists.
Avatars must be fetched via JOIN — but the chat query does not JOIN.

**From 022_combat_persistence.sql (second CREATE TABLE IF NOT EXISTS — a no-op if 002 ran first):**
```
id            UUID        PK
session_id    UUID        NOT NULL
sender_wallet TEXT        NOT NULL
sender_name   TEXT        NOT NULL DEFAULT 'Unknown'
body          TEXT        NOT NULL
kind          TEXT        NOT NULL DEFAULT 'chat'  -- chat | system | roll_result (NO 'whisper')
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
-- whisper_to and metadata are ABSENT from this definition
```

Since 002 runs first the CREATE IF NOT EXISTS in 022 is a no-op and the full schema
(including `whisper_to` and `metadata`) is preserved. **However**, 022 still runs its
ALTER TABLE / CREATE POLICY statements, adding a conflicting open-select policy.
See Bug 1.

---

## SECTION B — NFT image (PFP) in chat

### B6. Where is the NFT image URL stored?

| Table | Column | Populated how |
|-------|--------|---------------|
| `characters` | `avatar_url TEXT` | Step 1 of character creation extracts `metadata.image \|\| metadata.image_url \|\| metadata.imageUri \|\| metadata.imageURI` and stores it in the draft; step 6 saves it to the DB row. |
| `tokens` | `token_image_url TEXT` | Added by 009_tokens_pc_columns.sql; populated when a PC token is placed on the map. |
| `profiles` | `avatar_url TEXT` | Populated only by the manual profile-edit form (upsert API). **NOT** automatically synced from the NFT image. |

**There is no `token_image_url` column on the `characters` table.**
The NFT image lives at `characters.avatar_url`.

### B7. CharacterHeader.tsx — how it displays the NFT image

```tsx
{c.avatar_url ? (
  <img src={String(c.avatar_url)} ... />
) : (
  <div>No NFT</div>
)}
```

It reads `c.avatar_url` directly from the `CharacterSheetData` object which comes from
`characters.avatar_url`. **This works correctly** because:
1. The character is fetched in full (`select('*')`).
2. The NFT image was saved to `characters.avatar_url` at creation time.

### B8. src/lib/dnd721Token.ts

`dnd721Token.ts` is **not** an NFT metadata fetcher. It only defines:
- The DND721 ERC-20 *payment* token contract address (Base chain)
- A minimal ABI for `transfer`, `balanceOf`, `decimals`
- `toTokenWei()` and `SPONSOR_MONSTER_PRICE`

NFT metadata (the character PFP) is fetched via `/api/nft` (OpenSea API), not from
this file. The NFT character collection is a separate NFT contract; `dnd721Token.ts`
is the ERC-20 used for shop payments.

### B9. src/app/api/nft/route.ts

- Calls OpenSea v2 API to list all NFTs owned by a wallet.
- Filters to the DND721_CONTRACT address.
- For each NFT fetches full metadata from OpenSea; normalises to:
  `{ name, description, image, attributes }` where `image = inner.image_url ?? inner.image`.
- Returns `{ items: [{ contract, tokenId, metadata }] }`.
- **Does NOT save anything to the database.**
- Is called client-side during step 1 of character creation to let the player select
  their NFT. The image URL is then saved to the character draft and ultimately to
  `characters.avatar_url` in step 6.

### B10. profiles.avatar_url

- Exists on the `profiles` table.
- Set only when the user explicitly saves a profile (POST /api/profiles/upsert).
- **Not automatically populated from the NFT image.**
- Typically `null` for players who have never filled in their profile form.

### B11. Full NFT image chain — where it breaks

```
a. Player selects NFT in character creation step 1
b. /api/nft fetches NFT metadata from OpenSea
c. metadata.image is extracted client-side in step1/page.tsx
d. Image URL saved to character_draft.draft_data.avatar_url (localStorage / DB draft)
e. Step 6 creates the character row: characters.avatar_url = draft.avatar_url  ✓
f. TableChat.tsx populates avatarMap from profiles.avatar_url   ← BREAKS HERE
   (profiles.avatar_url is almost always null / not the NFT)
g. Chat renders avatarUrl = avatarMap[sender_wallet] ?? null
   → almost always null → shows initial-letter fallback
```

**The chain breaks at step f.** The chat builds its avatar cache from `profiles.avatar_url`
instead of `characters.avatar_url`.

### B12. What is the img src at runtime?

```tsx
const avatarUrl = avatarMap[m.sender_wallet?.toLowerCase() ?? ''] ?? null
// avatarUrl is null for virtually all users because:
//   1. The session_players → profiles join fails (no FK, see Bug 4)
//   2. Even if it succeeded, profiles.avatar_url is not the NFT image
```

At runtime, `avatarUrl` is `null` for all participants except possibly the sender's
own avatar (fetched separately via a direct profiles query — but even that uses
`profiles.avatar_url`, not `characters.avatar_url`).

---

## SECTION C — Whisper system

### C13. Whisper UI

The whisper UI **does exist** in `TableChat.tsx`:
- A 🤫 emoji button toggles `whisperMode`.
- When `whisperMode = true`, a `<select>` dropdown renders the `participants` list.
- The message textarea placeholder and send button change to purple.
- The `send()` function sets `kind: 'whisper'` and `whisper_to: whisperTarget` (wallet).

### C14. Participant list for whisper dropdown

Built in `loadParticipants()`:

```ts
// Step 1: Fetch players from session_players with profiles JOIN
const { data: playerRows, error } = await supabase
  .from('session_players')
  .select('wallet_address, profiles(display_name, username, avatar_url)')
  .eq('session_id', sessionId)

if (error) return  // ← ALWAYS returns here (FK missing, see Bug 4)
```

- Filters out the sender (`.filter(p => p.wallet !== myWallet)`) ✓
- **GM is included** — fetched separately via `sessions.gm_wallet`, then a direct
  `profiles` query by `wallet_address`. This part is fine.
- The list is keyed by wallet address, not user ID.

### C15. References to whisper across src/

| File | What it does |
|------|-------------|
| `TableChat.tsx` | Full whisper implementation: toggle, dropdown, send, render |
| `002_rebuild_backend.sql` | `session_messages.kind = 'whisper'`, `whisper_to TEXT`, RLS policy that restricts whispers |
| `022_combat_persistence.sql` | Adds open SELECT policy that breaks whisper RLS; its own CREATE TABLE IF NOT EXISTS omits `whisper_to` (moot since 002 runs first) |
| `session_rolls` | Has `is_whispered BOOLEAN` and `whisper_to TEXT` — a separate roll-whisper system, not chat |

No other files reference whisper.

### C16. RLS policies on session_messages

**Policy 1 — from 002_rebuild_backend.sql:**
```sql
CREATE POLICY "session_messages_select" ON session_messages FOR SELECT USING (
  kind != 'whisper'
  OR sender_wallet = current_wallet()
  OR whisper_to    = current_wallet()
  OR EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_messages.session_id
      AND s.gm_wallet = current_wallet()
  )
);
```
This policy is **correct** for whisper privacy.

**Policy 2 — from 022_combat_persistence.sql (runs after 002):**
```sql
CREATE POLICY "session_messages_select_open"
  ON session_messages FOR SELECT USING (true);
```
This is an open policy that allows ANY authenticated wallet to read ALL rows.

**Combined effect:**
PostgreSQL ORs multiple SELECT policies: `(correct_whisper_check) OR true = true`.
**All messages, including whispers, are visible to everyone.** This completely
breaks whisper privacy. See Bug 1.

### C17. When a whisper is sent

```ts
const row = {
  session_id:    sessionId,
  sender_wallet: senderWallet.toLowerCase(),
  sender_name:   senderName,
  body,
  kind:          'whisper',
  whisper_to:    whisperTarget,  // wallet address of recipient
}
await supabase.from('session_messages').insert(row)
```

- `is_whisper` (UUID-style field) is not used here — the system uses `kind = 'whisper'`.
- `whisper_to` is a wallet address (TEXT), not a UUID user ID.
- No server-side validation that the recipient is in the session.
- The INSERT RLS is: `sender_wallet = current_wallet()` — only prevents writing as
  someone else. ✓

### C18. Whisper message rendering

```tsx
if (isWhisper) {
  const label = isMe
    ? `🤫 Whisper → ${recipientName}`
    : `🤫 Whisper from ${m.sender_name}`
  return (
    <div className="... bg-purple-950/60 text-purple-100 border border-purple-700/50 italic">
      ...
    </div>
  )
}
```

- Purple background + italic — visually distinct ✓
- Shows "Whisper from / Whisper →" label ✓
- BUT due to broken RLS (Bug 1), everyone sees whispers that aren't for them ✗
- Due to empty participants list (Bug 4), the recipient name falls back to
  `shortWallet(m.whisper_to ?? '???')` instead of the character name ✗

### C19. Why the whisper dropdown is empty

**Root cause (b) + (c):**
- The participant list query fails entirely (FK missing → error → early return).
- The dropdown UI exists and is correct, but it has no data to populate.
- `participants` stays `[]`, so the dropdown renders:
  `<span>No other players connected</span>`

---

## SECTION D — Realtime and data freshness

### D20. New participant joins mid-session

- There is **no** realtime subscription on `session_players` or `session_participants`
  in `TableChat.tsx`.
- `loadParticipants` runs once on mount (keyed on `[sessionId, senderWallet]`).
- A player who joins after the chat loads **will not appear** in the whisper dropdown
  until the page is refreshed.
- `session_players` IS in the realtime publication (added by migration 011), so a
  subscription could be added — it just isn't.

### D21. Are NFT images loaded lazily or eagerly?

- `avatarMap` is built eagerly inside `loadParticipants` on mount.
- Because the FK join fails, `avatarMap` is almost always `{}` after mount.
- Even the sender's own avatar (fetched separately) reads from `profiles.avatar_url`,
  which is not the NFT image for most users.
- There is no lazy loading mechanism — if `avatarUrl` is null at render time there
  is no subsequent fetch; it stays as the initial-letter fallback forever.

---

## Summary table of schema facts

| Claim | True / False | Detail |
|-------|-------------|--------|
| `session_messages` has `whisper_to` | TRUE | From 002 |
| `session_messages` has `character_id` | FALSE | Never added |
| `session_messages` has `avatar_url` | FALSE | Never added |
| `characters` has `avatar_url` | TRUE | NFT image URL from creation |
| `characters` has `token_image_url` | FALSE | Only `tokens` table has this |
| `profiles` has `avatar_url` | TRUE | From 002; NOT auto-populated from NFT |
| `session_players` has FK to `profiles` | FALSE | Bug 4 root cause |
| `session_players` has FK to `characters` | TRUE | Via `character_id UUID REFERENCES characters(id)` |
| Whisper RLS works | FALSE | 022 open policy neutralises it |
| Realtime subscription on `session_players` | FALSE in chat | Only in DM panel / session_players publication |
