# Spellcaster Creation System Audit
_Files read: step1–6/page.tsx, layout.tsx, characters/[id]/page.tsx,
SpellsPanel.tsx, ResourcesPanel.tsx, ActionsPanel.tsx, calc.ts, types.ts,
spellcastingProgression.ts, features.ts, dnd5e.ts (absent), rules.ts,
characterDraft.ts, classResources.ts, backgrounds.ts (absent as standalone),
subclasses.ts, useCharacterDraftSync.ts, types/character.ts,
types/characterDraft.ts, srdspells/index.ts + types.ts + cantrips.ts +
level1.ts (sampled), api/character-draft/route.ts,
002_rebuild_backend.sql, 011_character_sheet_columns.sql_

---

## SECTION A — Spellcasting class detection

### A1. spellcastingProgression.ts — what is defined

The file defines **spell slot tables only** — it does NOT define cantrips-known
counts, spells-known counts, prepared formulas, spellbook data, or an
`isSpellcaster()` function.

Classes and their caster types as defined in `CLASS_CASTER_TYPE`:

| Class | CasterType | Slot table used | Notes |
|---|---|---|---|
| bard | `full` | FULL_CASTER_SLOTS_BY_LEVEL | ✓ present |
| cleric | `full` | FULL_CASTER_SLOTS_BY_LEVEL | ✓ present |
| druid | `full` | FULL_CASTER_SLOTS_BY_LEVEL | ✓ present |
| paladin | `half` | HALF_CASTER_SLOTS_BY_LEVEL | ✓ present — **BUG: no slots at level 1** |
| ranger | `half` | HALF_CASTER_SLOTS_BY_LEVEL | ✓ present — **BUG: no slots at level 1** |
| sorcerer | `full` | FULL_CASTER_SLOTS_BY_LEVEL | ✓ present |
| warlock | `none` | (none — handled separately by pact magic) | ✓ present |
| wizard | `full` | FULL_CASTER_SLOTS_BY_LEVEL | ✓ present |
| artificer | `artificer` | ARTIFICER_SLOTS_BY_LEVEL | extra, not required |

**Spellcasting ability, cantrips-known, spells-known, prepared formula,
spellbook, and pact magic flags are NOT defined in this file.**
The file exports only: `getSlotsForCasterType`, `getSpellSlotsForClass`,
`getWarlockPactRow`, and the `CLASS_CASTER_TYPE` map.

Half-caster slot table issue: `HALF_CASTER_SLOTS_BY_LEVEL[1] = {}` (empty).
This is 5e 2014 rules where Paladin/Ranger get no slots at level 1. The 2024
rules give half-casters their first slots at level 1, which this table
does not reflect.

### A2. isSpellcaster() function

**There is no `isSpellcaster()` function anywhere in the codebase.**

Detection is done inline in `step4/page.tsx` and `step6/page.tsx` using a
local constant array:

```typescript
const SPELLCASTING_CLASSES = [
  'wizard','sorcerer','cleric','druid','bard','paladin','ranger','warlock'
]
```

All 7 required spellcasting classes (plus warlock = 8 total) are present in
both locations. No class is missing from this check.

### A3. Which step handles spell selection

**Step 4** (`src/app/characters/new/step4/page.tsx`).
The layout names it "Spellcasting".

The step is conditionally skipped: if the class is not in
`SPELLCASTING_CLASSES` AND not an EK/AT subclass AND has no racial magic,
the page calls `router.replace('/characters/new/step5')` immediately on mount.

### A4. Are any spellcasting classes incorrectly skipped?

No. All 8 spellcasting classes are in the local `SPELLCASTING_CLASSES` array.
None are skipped. All 8 correctly land on step4.

---

## SECTION B — Cantrip and spell limits

### B5. What creation CURRENTLY enforces vs 5.5e (2024) requirements

**Summary: NOTHING is enforced. There are no limits at all in the current code.**

`toggleKnown(spellName)` and `togglePrepared(spellName)` simply toggle the
name into/out of `knownSpells[]` and `preparedSpells[]` with no cap check.

Additional per-class issues:

**BARD**
- Required (2024): 2 cantrips, 4 spells known
- Current: 0 enforced. Player can pick 0 or 50.
- maxSpellLevel for level 1 bard: `FULL_CASTER_SLOTS_BY_LEVEL[1] = {1:2}` → 1. ✓
  Player sees bard cantrips + 1st-level bard spells. Correct list, no limits.

**CLERIC**
- Required (2024): 3 cantrips, prepared = WIS mod + level (min 1)
- Current: 0 enforced. No cantrip counter. No prepared-count formula shown.
- maxSpellLevel for level 1 cleric: 1. ✓

**DRUID**
- Required (2024): 2 cantrips, prepared = WIS mod + level (min 1)
- Current: 0 enforced.
- maxSpellLevel for level 1 druid: 1. ✓

**PALADIN**
- Required (2024): 0 cantrips, prepared = CHA mod + half Paladin level (min 1)
- Current: 0 enforced. **CRITICAL: maxSpellLevel = 0 for level 1 Paladin.**
  `HALF_CASTER_SLOTS_BY_LEVEL[1] = {}` → `spellSlots = {}` → keys = [] →
  `maxSpellLevel = 0`. Level-cap filter removes ALL 1st-level spells. Player
  can only see cantrips (level 0). But paladin has very few SRD cantrips (none
  in the spell data tagged `paladin`). Effectively a level 1 Paladin can select
  NO spells of any kind.

**RANGER**
- Required (2024): 0 cantrips, 2 spells known
- Current: **CRITICAL: maxSpellLevel = 0 for level 1 Ranger** (same root cause
  as Paladin — half-caster empty slot table at level 1). Rangers have no
  cantrips in 5.5e AND no ranger cantrips tagged in SRD data. Level 1 Rangers
  can select NOTHING.

**SORCERER**
- Required (2024): 4 cantrips, 2 spells known
- Current: 0 enforced. maxSpellLevel = 1. ✓ Player sees sorcerer cantrips +
  1st-level spells. No limit enforcement.

**WARLOCK**
- Required (2024): 2 cantrips, 2 spells known
- Current: 0 enforced. pact at level 1 = {pactSlots:1, pactSlotLevel:1} →
  maxSpellLevel = 1. ✓ Player sees warlock cantrips + 1st-level spells.

**WIZARD**
- Required (2024): 3 cantrips, 6 spells in spellbook (6 + INT mod minimum)
- Current: 0 enforced. maxSpellLevel = 1. ✓ Player sees wizard cantrips +
  1st-level spells, but no spellbook concept, no 6+INT limit, no distinction
  between spellbook and prepared.

### B6. Hard cap on spell selection

**None.** `toggleKnown` has no length check. Player can select unlimited spells.

### B7. Minimum enforced / can player skip entirely?

**No minimum at all.** `handleNext()` in step4:
```typescript
function handleNext() {
  if (draft) saveDraft(draft)
  router.push('/characters/new/step5')
}
```
The Next button is always enabled. A Wizard with INT 20 can proceed with
0 cantrips and 0 spells.

### B8. How is the spell count limit calculated?

**It is not calculated.** There is no call to any limit function in step4.
`spellcastingProgression.ts` does not export cantrips-known or spells-known
tables. Step4 only uses `getSpellSlotsForClass` to determine `maxSpellLevel`
(for the level-cap filter) — not to count how many spells to pick.

---

## SECTION C — Spell list filtering

### C9. Class-based spell filtering

**YES — correctly implemented.** Step4 filters:
```typescript
const filteredSpells = SRD_SPELLS.filter((spell) => {
  if (spellClass && !spell.classes?.includes(spellClass)) return false
  if (spell.level > 0 && spell.level > maxSpellLevel) return false
  ...
})
```
A Cleric will not see Fireball (tagged only wizard/sorcerer). Filtering is
correct when `spellClass` is set.

### C10. Spell `classes` array

**YES — every spell has `classes?: SpellClass[]`.** The `SpellClass` type covers
all 8 caster classes. Sample from cantrips.ts:
- `Acid Splash` → `['sorcerer', 'wizard']`
- `Blade Ward` → `['bard', 'sorcerer', 'warlock', 'wizard']`
- `Druidcraft` → only druids (implied)

### C11. Cantrips vs leveled spells distinction

**MIXED in same list.** No separate section for cantrips (level 0) vs
1st-level spells. The filter dropdown (`All Levels / Cantrips / 1st Level`)
lets users filter, but the default view shows them mixed. User must actively
filter to see only cantrips.

### C12. Prepared vs known distinction

Step4 shows two buttons per spell: `Mark Known` and `Prepare`.
- `knownSpells[]` — spell names
- `preparedSpells[]` — spell names (subset of known, ideally)

There is no label explaining the distinction. For known-casters (Bard,
Sorcerer, Warlock, Ranger) the "prepare" concept doesn't apply — spells known
are always available. The dual-button UI creates confusion for these classes.

No prepared spell cap is shown or enforced during creation for any class.

### C13. Wizard spellbook

**NOT IMPLEMENTED.** Wizard uses the same generic known/prepared flow.
No spellbook concept, no 6+INT mod spellbook size calculation, no indication
that wizard prepares from a spellbook rather than a "known list."

### C14. Cleric domain spells

**NOT HANDLED.** When a Cleric has a subclass (e.g., Life Domain), the domain's
bonus spells are not auto-added to the selection. At level 1 this is a non-issue
(subclasses unlock at level 3 in 2024), but for level 3+ clerics created via
creation flow, domain spells are never auto-populated.

---

## SECTION D — Spell data saved to character

### D15. What is saved to the characters table

In `step6/page.tsx` (`handleSave`):
```typescript
spells_known:  [...draft.knownSpells, ...innateSpells, ...racialCantrip],
spells_prepared: draft.preparedSpells ?? [],
```
Both are **TEXT[] — arrays of spell names only.** No spell metadata is stored.

### D16. Is enough spell data saved to render SpellsPanel?

**Yes — SpellsPanel works around missing metadata by looking up names in
SRD_SPELLS at runtime.** SpellsPanel loads the entire `SRD_SPELLS` array and
marks spells as Known/Prepared based on name membership. It doesn't need a
full saved spell object — it reconstructs from SRD.

However: the character's own saved spell data contains only names. The
following fields are NOT saved:
- `level` (must be looked up)
- `school`, `casting_time`, `range`, `components`, `duration` (must be looked up)
- `is_concentration`, `is_ritual`, `is_domain`, `in_spellbook` (nowhere stored)

### D17. Cantrips stored differently?

**No.** Cantrips are just in `spells_known TEXT[]` alongside leveled spells.
No separation. Level 0 vs level N is determined by SRD lookup by name.

### D18. Spell slots saved

**YES — `spell_slots JSONB` column.** Step6 calculates this from class+level
and saves it:
- Non-warlock: `getSpellSlotsForClass(classKey, level)` → `{1: 2}` etc.
- Warlock: `{ [pactSlotLevel]: pactSlots }` — e.g., `{"1": 1}` at level 1.
- Third-caster subclasses: `getSlotsForCasterType('third', level)`.

**Bug here too:** For level 1 Paladin/Ranger, `getSpellSlotsForClass` returns
`{}`, so `spell_slots` is saved as an empty object. No slots on the character
sheet for level 1 Paladin or Ranger.

---

## SECTION E — SpellsPanel after creation

### E19. SpellsPanel — what data it reads

From `CharacterSheetData` (`c` prop):
- `c.main_job` → derives `classSpellTag` for class filtering
- `c.spells_known` → initial `knownList` state
- `c.spells_prepared` → initial `preparedList` state
- `c.spellcasting_ability` → shown as "Non-spellcaster" if null; also gates the
  DC/attack display
- `c.spell_save_dc`, `c.spell_attack_bonus` → displayed
- `c.id` → for persistSpells Supabase update

Spell slots come from a separate prop: `spellSlots={c.spell_slots ?? null}`.
SpellsPanel does NOT fetch spells from Supabase — it uses `SRD_SPELLS` directly.

### E20. Hiding check for non-spellcasters

In `characters/[id]/page.tsx`:
```typescript
const isMageUser = Boolean(c.spellcasting_ability)
```
The "Spellbook" tab and `SpellsPanel` are only rendered if `isMageUser === true`.

**CRITICAL BUG: `spellcasting_ability` is not a column in any migration file.**
Grep of all migrations found: `spell_save_dc`, `spell_attack_bonus`, `spell_slots`
added in 011_character_sheet_columns.sql, but `spellcasting_ability` is absent.

Consequences:
1. If the live DB lacks this column, `supabase.from('characters').insert(payload)`
   in step6 fails with a PostgREST 400 error for ALL spellcasters — character
   creation is broken for all 8 spellcasting classes.
2. If the live DB has the column added manually (no migration), the column
   exists but is unguarded — a fresh project deployment would break.
3. Either way, characters created before the column was added (or on a fresh
   deploy) have `spellcasting_ability = null`, making `isMageUser = false`,
   hiding the Spellbook tab entirely.

### E21. SpellsPanel in character page layout

- The Spellbook tab only appears in the tab row if `isMageUser` is true
- It renders: `{activeTab === 'magic' && isMageUser && <SpellsPanel ... />}`
- If `isMageUser` is false, no tab button exists and no panel renders

### E22. Is the Spellbook tab obvious?

The tab row is: Overview | Skills & Traits | Gear | Notes | [Spellbook if isMageUser]
The Spellbook tab appears last when present. If a player doesn't know to look,
they might not find it. No badge count on the tab.

### E23. Null vs empty spells handling

SpellsPanel initializes:
```typescript
const [knownList, setKnownList] = useState<string[]>(() => (c.spells_known ?? []) as string[])
const [preparedList, setPreparedList] = useState<string[]>(() => (c.spells_prepared ?? []) as string[])
```
Both handle `null` with `?? []`. SpellsPanel always renders its full browser
even with empty known/prepared lists. **Does not return null for empty data.**

### E24. SpellsPanel Supabase query vs prop data

- Initial spell data comes from the character page's `c` prop (fetched once
  via `select('*')`)
- SpellsPanel makes direct Supabase writes in `persistSpells` when user
  toggles Known/Prepared
- No separate query inside SpellsPanel — it uses prop data exclusively for init

---

## SECTION F — Subclass spellcasting

### F25. Eldritch Knight / Arcane Trickster

**Handled correctly.** Step4 checks:
```typescript
const isEK = classKey === 'fighter' && subclassKey === 'fighter_eldritch_knight' && level >= 3
const isAT = classKey === 'rogue'   && subclassKey === 'rogue_arcane_trickster'  && level >= 3
```
If either is true, the spell step shows with wizard spell list and
`getSlotsForCasterType('third', level)` slots.

### F26. Warlock invocations

Not relevant to level 1 — warlocks get invocations at level 2. The creation
flow does not show invocations anywhere. Correct.

---

## SECTION G — Draft sync

### G27. Spell selections saved to draft

**YES.** `updateDraft({ knownSpells, preparedSpells })` calls `saveDraft()`
which writes to localStorage immediately. Going back and returning to step4
restores `knownSpells`/`preparedSpells` from the merged draft in `useEffect`.
Page refresh preserves selections (localStorage persistence).

### G28. character-draft API

`POST /api/character-draft` upserts `draft_data JSONB` to `character_drafts`
table. The blob is the full `CharacterDraft` object including `knownSpells` and
`preparedSpells` string arrays. Spell metadata (level, school etc.) is NOT saved
in the draft — only names.

On mount, if localStorage is empty, the hook fetches from Supabase and restores
all fields including spell selections. Cross-device recovery works for spell
names.

---

## DATABASE SCHEMA — characters table spell columns

From `002_rebuild_backend.sql` (base schema):
```sql
spells_known        TEXT[]  NOT NULL DEFAULT '{}'
spells_prepared     TEXT[]  NOT NULL DEFAULT '{}'
```

From `011_character_sheet_columns.sql` (additive):
```sql
spell_save_dc       INT
spell_attack_bonus  INT
spell_slots         JSONB
```

**`spellcasting_ability TEXT` — COLUMN DOES NOT EXIST IN ANY MIGRATION.**
Step6 saves it; `CharacterSheetData` reads it; `isMageUser` gates on it.
No migration creates it.

---

## Summary table

| Claim | Reality |
|---|---|
| `isSpellcaster()` exported from spellcastingProgression.ts | FALSE — does not exist; inline arrays used |
| All 8 spellcasting classes detected in step4 | TRUE — local SPELLCASTING_CLASSES array is complete |
| Level 1 Ranger can select spells | **FALSE** — maxSpellLevel=0, no spells shown |
| Level 1 Paladin can select spells | **FALSE** — maxSpellLevel=0, no spells shown |
| Cantrip/spell selection limits enforced | **FALSE** — no caps at all |
| Minimum spells enforced before Next | **FALSE** — Next always enabled |
| Wizard spellbook concept implemented | **FALSE** — same generic flow as all other casters |
| Cleric domain spells auto-added | **FALSE** — not implemented |
| `spellcasting_ability` column in migrations | **FALSE** — missing from all migration files |
| Spellbook tab always shows for spellcasters | **FALSE** — gated by missing column |
| Spell metadata (school, duration etc.) saved per character | **FALSE** — names only |
| SpellsPanel returns null for empty spells | **FALSE** — renders browser even if empty |
| Draft sync preserves spell selections across refresh | TRUE — localStorage + Supabase backup |
