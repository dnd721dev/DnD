# Spell Dashboard Audit

## Q1 — How are spell slots stored?

Two separate JSONB columns on the `characters` table. There is **no `sheet_data` column**.

| Column | Type | What it holds |
|---|---|---|
| `spell_slots` | `JSONB` | Max slots per level — `{"1": 4, "2": 3, "3": 2}` |
| `resource_state` | `JSONB` | Used counts — `{"spell_slot_used_1": 2, "spell_slot_used_2": 1}` |

Added in migration `011_character_sheet_columns.sql`:
```sql
ALTER TABLE characters ADD COLUMN IF NOT EXISTS spell_slots JSONB;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS resource_state JSONB NOT NULL DEFAULT '{}';
```

The TS type for the max column is `SpellSlotsSummary = Record<string, number>` (from
`src/components/character-sheet/types.ts`). To build a combined `{ max, used }` view the
dashboard reads both columns and merges them.

**The prompt's assumption that slots live in `characters.sheet_data.spellSlots` is wrong —
`sheet_data` does not exist.**

---

## Q2 — Are spell slots syncing between sheet and session table?

**Partially.** `SpellsPanel.tsx` accepts `onSpendSlot` / `onRestoreSlot` callbacks and a
`slotUsed` prop. These are wired in the full character sheet page. The callbacks update
`resource_state` via `updateResourceState()` in `PlayerSidebar.tsx`.

There is **no realtime subscription in SpellsPanel** — it relies on the parent re-rendering.
Cross-tab syncing (e.g. spells page ↔ session table) does not exist today. The dashboard will
add a Realtime subscription on `characters.resource_state` to stay in sync.

---

## Q3 — How are prepared spells stored?

Two `TEXT[]` columns (array of spell names, not objects):

```sql
spells_known    TEXT[] NOT NULL DEFAULT '{}'
spells_prepared TEXT[] NOT NULL DEFAULT '{}'
```

Example row value: `["Cure Wounds", "Healing Word", "Fireball"]`

`SpellsPanel.tsx` persists via:
```ts
supabase.from('characters').update({ spells_known, spells_prepared }).eq('id', c.id)
```

Each spell name is then cross-referenced against `SRD_SPELLS` at runtime to get the full
`SrdSpell` object with school, casting time, damage, etc. There is **no per-character spell
object with level/description/damage_dice** — all mechanical data comes from the static
`SRD_SPELLS` array.

---

## Q4 — Can combat spells be distinguished from healing spells?

**Not by a dedicated field.** The `SrdSpell` type has no `category`, `type`, or `tags` field.

Combat vs healing must be inferred from the spell's data fields:

| Category | Detection rule |
|---|---|
| **Combat** | `spell.damage` is set, OR `spell.attackRoll === true`, OR `spell.saveAbility` is set AND `spell.damage` is set |
| **Healing** | Spell name is in a known healing list OR `spell.notes` contains keywords: "regain", "heal", "cure", "restore", "hit points" |
| **Utility** | Everything else |

Note: many save spells (Sleep, Hold Person) have `saveAbility` but no `damage` — they are
utility/debuff, not "combat damage" spells.

---

## Q5 — `src/lib/srdspells/` — full field list

```typescript
type SrdSpell = {
  name: string          // "Cure Wounds"
  level: number         // 0 = cantrip
  school: string        // "Evocation"
  castingTime: string   // "1 action"
  range: string         // "Touch"
  components: string    // "V, S"
  duration: string      // "Instantaneous"
  attackRoll?: boolean  // true = spell attack roll (NOT named 'spell_attack')
  saveAbility?: SpellSaveAbility  // 'str'|'dex'|'con'|'int'|'wis'|'cha' (NOT named 'save_type')
  damage?: string       // "2d8" or "1d10" (NOT named 'damage_dice'; healing spells do NOT have this)
  notes?: string        // free-text description; healing dice live here e.g. "1d8+spellcasting mod"
  classes?: SpellClass[]
  upcastDamage?: string // extra dice per slot level above base, e.g. "1d8"
  upcastNotes?: string  // narrative override for upcast table
}
```

**There is no `heal_dice` field.** Healing spells store their dice info in `notes` as
plain text (e.g., "1 creature regains 1d8 + spellcasting modifier hit points").

**There is no `damage_type` field** — damage type (fire, cold, necrotic…) lives inside
`notes` or `damage` string when present.

**`is_concentration`** does not exist as a boolean; concentration spells are identified by
`duration.includes('concentration')`.

**`is_ritual`** does not exist as a boolean; ritual spells are identified by
`castingTime.includes('ritual')`.

Heal dice are extracted via a curated lookup table keyed by spell name, falling back to a
regex that matches `\d+d\d+` in `notes`.

---

## Q6 — How are tokens loaded for a session?

Tokens do **not** have a `session_id` column. The query chain is:

```
sessions.id  →  encounters.session_id  →  tokens.encounter_id
```

Step 1: `SELECT id FROM encounters WHERE session_id = $sessionId LIMIT 1`
Step 2: `SELECT * FROM tokens WHERE encounter_id = $encounterId`

Token HP fields are `hp` (max) and `current_hp` (current). The prompt uses
`npc_hp_current` / `npc_hp_max` but those columns **do not exist**. The session token
update for HP is: `UPDATE tokens SET current_hp = $newHp WHERE id = $tokenId`.

PC tokens also have `owner_wallet` and `type = 'pc'`.

---

## Q7 — Existing `/sessions/[id]/spells` page?

**None.** The current `src/app/sessions/[id]/` directory contains only:

```
SessionClient.tsx
error.tsx
page.tsx
recording/[recordingId]/page.tsx
table/TableClient.tsx
table/TableClientShell.tsx
table/error.tsx
table/page.tsx
```

No spells route exists. It will be created fresh.

---

## Additional deviations from the prompt spec

| Prompt assumption | Reality |
|---|---|
| `characters.sheet_data.spellSlots` | Does not exist; use `spell_slots` + `resource_state` |
| `spell.damage_dice` | Field is `spell.damage` |
| `spell.save_type` | Field is `spell.saveAbility` |
| `spell.spell_attack` (boolean) | Field is `spell.attackRoll` (boolean) |
| `spell.heal_dice` | Field does not exist; parse from `spell.notes` |
| `spell.is_concentration` | Does not exist; use `spell.duration.includes('concentration')` |
| `token.npc_hp_current` / `npc_hp_max` | Fields are `token.current_hp` and `token.hp` |
| `tokens.session_id` | Does not exist; load via `encounters.session_id → tokens.encounter_id` |
| `session.campaigns.dm_user_id` | Does not exist; use `session.gm_wallet` |
| `session_participants.character_id` | `session_participants` has no `character_id`; use `session_characters` table |
| `/api/roll` accepts `modifier` separately | Modifier must be baked into `notation`, e.g. `"1d20+5"` |
| `rollType: 'healing'` | Not a valid enum value; use `'damage'` or `'custom'` |
