# Homebrew Monster Spawn — Audit

## 1. MonsterLibrary.tsx — the homebrew button

### How it displays monsters
MonsterLibrary.tsx loads a combined list of:
- SRD monsters from the bundled `MONSTERS` array (prefixed `srd:<id>`)
- Custom monsters from the old `monsters` Supabase table (prefixed `db:<id>`)

It unifies them into a `UnifiedMonster[]` list filtered by search text and CR range.
Clicking a card opens an inline stat-block detail panel inside the same component.
The stat block shows ability scores, skills, senses, traits, actions, and a Spawn button.
The Spawn button calls `onSpawnMonster({ id, name })`.

**There is no separate section or tab for homebrew monsters.** The `+ Homebrew`
button is a pure navigation element; it does not show homebrew monsters inline at all.

### What the homebrew button does — exact location

**File:** `src/components/table/MonsterLibrary.tsx`, **lines 176–182**

```tsx
<Link
  href="/homebrew"
  target="_blank"
  className="rounded-md border border-emerald-700/60 bg-emerald-900/40 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-800/50"
>
  + Homebrew
</Link>
```

This is a Next.js `<Link>` with `target="_blank"`. In theory it opens a new tab.
In practice, on some browsers / mobile views `target="_blank"` is ignored by the
Next.js `<Link>` component and the navigation happens in the same tab, which kills
the session context. The spec requires the button never navigate at all—it should
load homebrew monsters inline.

**Root cause line:** `MonsterLibrary.tsx line 176 — <Link href="/homebrew" target="_blank">`

---

## 2. DMPanel.tsx — monster-library rendering

DMPanel itself does NOT render MonsterLibrary. It is a separate panel for:
- ⚔ Combat tab: token targeting, HP adjustment, conditions, MonsterStatPanel
- 🎲 Tools tab: dice rolls, XP awards, encounter calculator, place-characters

MonsterLibrary is rendered inside **GMSidebar.tsx** (⚔ Combat tab, right column):

```tsx
// GMSidebar.tsx line 270
<MonsterLibrary onSpawnMonster={spawnMonsterToken} />
```

`spawnMonsterToken` is the real spawn function defined in `TableClient.tsx`
and passed down as a prop through GMSidebar.

**No homebrew fetch exists in DMPanel.** DMPanel does fetch monster stat data
from the old `monsters` table when a token is clicked (loadMonster effect,
lines 75–115), but that is separate from the MonsterLibrary spawn flow.

---

## 3. Homebrew API routes

### `/api/homebrew/monsters/route.ts` — EXISTS and is correct

Created in the previous session. It:
- Uses `supabaseAdmin()` (bypasses RLS)
- Reads `x-wallet-address` header from the request
- GET: returns all `is_published = true` monsters PLUS the caller's own drafts
- POST/PATCH/DELETE: full CRUD with ownership checks
- Returns `{ monsters: [...] }` with all columns from `homebrew_monsters`

The route is compatible with what MonsterLibrary needs.

---

## 4. homebrew_monsters table schema

**Migration:** `supabase/migrations/026_homebrew_monsters.sql`

All columns needed for spawning a token ARE present:
- `name TEXT NOT NULL`
- `ac INT` — armor class
- `hp INT` — hit points
- `str / dex / con INT` — for DEX modifier initiative roll
- `int_score / wis / cha INT`
- `cr TEXT` — challenge rating
- `type TEXT` — creature type
- `size TEXT`
- `speed TEXT`
- `traits JSONB` — array of `{ name, description }`
- `actions JSONB` — array with attack data
- `token_image_url TEXT`

**The `tokens` table has `homebrew_monster_id UUID`** (added by the same migration)
that links a spawned token back to its homebrew monster row. This is the key column
that separates homebrew tokens from SRD tokens.

---

## 5. SRD monster spawn flow — exact shape needed

**Function:** `TableClient.tsx` lines 805–919 — `spawnMonsterToken`

```typescript
async function spawnMonsterToken(monster: { id: string; name: string }) {
```

What it does:
1. Counts existing tokens to pick a non-overlapping spawn position
2. For `srd:` prefix: looks up HP / AC / DEX from the bundled MONSTERS array
3. Auto-rolls initiative (d20 + DEX mod)
4. Inserts a `tokens` row:
   ```typescript
   {
     encounter_id: encounterId,
     map_id: currentMapId,
     type: 'monster',
     monster_id: monster.id,   // <-- "srd:goblin" or "db:<uuid>"
     name: monster.name,
     label: monster.name,
     x: startX,
     y: startY,
     hp: baseHp,
     current_hp: baseHp,
     ac: baseAc,
   }
   ```
5. Inserts an `initiative_entries` row

**What homebrew needs added:**
- `homebrew_monster_id: <uuid>` in the tokens insert (the FK column)
- `monster_id` should be `null` for homebrew tokens (no SRD slug)
- HP / AC / DEX should come directly from the homebrew monster object
  (no extra fetch needed — pass them alongside the id)

**Required parameter extension:**
```typescript
type SpawnMonsterParams = {
  id: string
  name: string
  hp?: number | null
  ac?: number | null
  dexScore?: number | null
  homebrewMonsterDbId?: string | null  // UUID of homebrew_monsters row
}
```

When `homebrewMonsterDbId` is set: use inline hp/ac/dex values, set
`homebrew_monster_id` on the token, set `monster_id` to `null`.

---

## 6. MonsterStatPanel.tsx

MonsterStatPanel is a **generic** stat block renderer. It already handles both
SRD and non-SRD data shapes because it reads fields with multiple aliases:

```typescript
// It handles both SRD field names AND database field names:
const acValue =
  m.ac ?? m.armor_class ?? m.armorClass ?? ...

const hpValue =
  m.hp ?? m.hit_points ?? m.hitPoints ?? ...
```

Ability scores via `getAbility()` also try multiple key variants including
`m.int_score` for INT (the homebrew_monsters column name).

**MonsterStatPanel will display homebrew monster data correctly with zero changes**
as long as the homebrew monster row from Supabase is passed in as the `monster` prop.

The only wiring needed is in **DMPanel.tsx loadMonster effect** — it currently only
handles `srd:` and `db:` prefixes from the old monsters table. It needs a third
branch for homebrew tokens using `selectedToken.homebrew_monster_id`.

---

## Fixes needed

| Fix | File | Change |
|---|---|---|
| FIX 1 | MonsterLibrary.tsx | Remove `<Link>`, add inline homebrew tab + list |
| FIX 2 | MonsterLibrary.tsx | Fetch from `/api/homebrew/monsters` on tab click |
| FIX 3 | MonsterLibrary.tsx | Extend `onSpawnMonster` type with homebrew fields |
| FIX 4 | GMSidebar.tsx | Update `spawnMonsterToken` prop type |
| FIX 5 | TableClient.tsx | Extend `spawnMonsterToken` params, add hb: branch, insert `homebrew_monster_id` |
| FIX 6 | DMPanel.tsx | Add homebrew stat block loading via `homebrew_monster_id` |

The **root cause** was `MonsterLibrary.tsx line 176`: a Next.js `<Link href="/homebrew">`
with `target="_blank"` that in some browser/mobile contexts navigates in the same tab
instead of opening a new one, and even when it does open a new tab it provides zero
homebrew monster functionality within the session — the DM has no way to place homebrew
monsters on the map without leaving/backgrounding the session.
