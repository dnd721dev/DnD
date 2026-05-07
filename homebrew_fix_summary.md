# Homebrew Monster Builder — Change Summary

## 1. Fields Added to the Form

The old Monsters tab had 4 fields (Name, CR, HP, AC). The rebuilt tab has a full D&D 5e stat block builder across 10 collapsible sections:

| Section | Fields |
|---|---|
| **Basic Info** | Name, CR (dropdown), XP (auto-filled from CR), Size, Type, Subtype, Alignment |
| **Combat Stats** | AC, HP, Hit Dice, Speed |
| **Ability Scores** | STR, DEX, CON, INT, WIS, CHA (each with auto-calculated modifier shown) |
| **Proficiencies & Defenses** | Saving throw checkboxes (per ability), Skills (name + bonus rows), Damage Resistances, Damage Immunities, Damage Vulnerabilities, Condition Immunities (tag chips) |
| **Senses & Languages** | Senses (text), Languages (text) |
| **Traits** | Dynamic list — Name + Description per trait |
| **Actions** | Dynamic list — Name + Attack/Hit/Damage/Range/Description per action |
| **Bonus Actions** | Same structure as Actions |
| **Reactions** | Same structure as Actions |
| **Legendary Actions** | Count selector + same per-action structure |
| **Presentation** | Token Image URL (with live preview), Description/Lore, Published toggle |

Additional UI: SRD Import modal lets you search all ~350 SRD monsters and pre-fill the entire form from an existing monster's stat block.

---

## 2. Database Columns Added

**Migration `026_homebrew_monsters.sql`** creates the `homebrew_monsters` table:

```
id                      UUID        PRIMARY KEY
creator_wallet          TEXT        NOT NULL           -- wallet-based auth (no Supabase auth required)
name                    TEXT        NOT NULL
cr                      TEXT        NOT NULL DEFAULT '0'
xp                      INT
size                    TEXT
type                    TEXT
subtype                 TEXT
alignment               TEXT
ac                      INT
hp                      INT
hit_dice                TEXT
speed                   TEXT
str / dex / con         INT         NOT NULL DEFAULT 10
int_score / wis / cha   INT         NOT NULL DEFAULT 10
saving_throws           JSONB       DEFAULT '{}'       -- { str: true, dex: false, … }
skills                  JSONB       DEFAULT '[]'       -- [{ name, bonus }]
damage_resistances      TEXT
damage_immunities       TEXT
damage_vulnerabilities  TEXT
condition_immunities    JSONB       DEFAULT '[]'       -- string[]
senses                  TEXT
languages               TEXT
traits                  JSONB       DEFAULT '[]'       -- [{ name, description }]
actions                 JSONB       DEFAULT '[]'       -- [{ name, attack_bonus, hit_dice, damage_type, range, description }]
bonus_actions           JSONB       DEFAULT '[]'
reactions               JSONB       DEFAULT '[]'
legendary_actions       JSONB       DEFAULT '[]'
legendary_action_count  INT         NOT NULL DEFAULT 3
token_image_url         TEXT
description             TEXT
is_published            BOOLEAN     NOT NULL DEFAULT true
created_at / updated_at TIMESTAMPTZ
```

The same migration also adds `homebrew_monster_id UUID` to the `tokens` table so MapBoard can distinguish homebrew tokens from SRD tokens.

Row-level security uses the wallet pattern:
- Anyone can SELECT published monsters or their own drafts
- INSERT/UPDATE/DELETE only allowed when `creator_wallet` matches the request's `x-wallet-address` header

---

## 3. How the Live Preview Works

The `StatBlockPreview` component (inside `MonstersTab.tsx`) renders a gold-themed D&D stat block in real time using only React state — no save needed.

- **Modifier display**: `Math.floor((score - 10) / 2)` shown as `(+N)` or `(−N)` next to each ability score
- **Proficiency bonus**: `pbForCr(cr)` looks up the CR's proficiency bonus from the PHB table (e.g., CR 1–4 = +2, CR 5–8 = +3…)
- **Challenge rating line**: shows CR and XP from `CR_TO_XP[cr]`
- **Action descriptions**: if an action's `description` field is empty, the preview auto-generates a line like `Melee Weapon Attack: +N to hit, reach 5 ft., one target. Hit: Xd6+N damage_type damage.` from the structured attack fields
- **Sections hidden when empty**: traits, bonus actions, reactions, and legendary actions sections only render if the array is non-empty; the legendary actions block only appears if `legendary_action_count > 0` and there is at least one legendary action
- **Token image**: if `token_image_url` is set, the image appears as a circular avatar in the preview header

---

## 4. How Community Monsters Load and Filter

On mount, `MonstersTab` calls `GET /api/homebrew/monsters` with the user's wallet in `x-wallet-address`. The API returns:
- All monsters where `is_published = true` (visible to everyone)
- Plus the current user's unpublished drafts

After loading, a Supabase Realtime subscription (`homebrew_monsters` table `INSERT`/`UPDATE`/`DELETE` events) keeps the list live — if another user publishes a monster, it appears automatically.

**Client-side filters** (no extra DB calls):

| Filter | Behavior |
|---|---|
| Search box | Case-insensitive match on `name`, `type`, or `subtype` |
| Type dropdown | Exact match on `type` (e.g., "undead", "dragon") — populated from distinct types present in the loaded list |
| CR min / CR max | Numeric comparison using `crToNum()` which converts fractions ('1/4' → 0.25, etc.) |

Results are sorted by name (matching the API `ORDER BY name`). Count shown in section heading updates as filters change.

---

## 5. How "Add to Session" Connects to the Tokens Table

Each monster card has an **Add to Session** button (visible when a wallet is connected). Clicking it opens a small inline dropdown listing active/lobby sessions from the `sessions` table.

When the user selects a session and confirms:

```typescript
await supabase.from('tokens').insert({
  session_id:          selectedSessionId,
  homebrew_monster_id: monster.id,   // FK → homebrew_monsters.id
  monster_id:          null,         // SRD slug; null for homebrew
  name:                monster.name,
  token_image_url:     monster.token_image_url ?? null,
  x: 5, y: 5,                        // default map position
  hp: monster.hp,
  max_hp: monster.hp,
  ac: monster.ac,
  size: monster.size ?? 'medium',
})
```

The `homebrew_monster_id` column (added by migration 026) is the distinguishing key that lets MapBoard know this token represents a homebrew creature rather than an SRD slug. MapBoard can later `JOIN` on `homebrew_monster_id` to load the full stat block (saving throws, actions, legendary actions, etc.) for encounter tracking.

---

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/026_homebrew_monsters.sql` | **Created** — new table + RLS + `tokens.homebrew_monster_id` FK |
| `src/app/api/homebrew/monsters/route.ts` | **Created** — GET/POST/PATCH/DELETE API using `supabaseAdmin()` |
| `src/app/homebrew/MonstersTab.tsx` | **Created** — full ~900-line stat block builder component |
| `src/app/homebrew/page.tsx` | **Updated** — replaced 4-field inline `MonstersTab` with `import MonstersTab from './MonstersTab'` |
