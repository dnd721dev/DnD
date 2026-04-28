# Character Sheet — Fix Summary

All 9 bugs from `character_sheet_bugs.md` have been implemented and `npx tsc --noEmit` passes cleanly.

---

## Changes by Bug

### C1 — Unarmored classes no longer get Breastplate as default
**File:** `src/app/characters/new/step5/page.tsx`

- `defaultArmorKey` for unarmored classes (monk, wizard, sorcerer) now falls to `''` instead of `allArmors[0]?.key` (Breastplate).
- `updateDraft` now sets `armorKey = null` (not the old invalid key) when the current armor isn't available for the class.
- `currentArmor` is now `null` when no armor is selected instead of falling back to the first in the list.
- The armor `<select>` `onChange` converts `''` → `null` so the draft never stores an empty string.

### M3 — "No armor (Unarmored)" option added to armor select
**File:** `src/app/characters/new/step5/page.tsx`

- A leading `<option value="">No armor (Unarmored)</option>` is now always present.
- For unarmored classes this is the only option in practice (class filter returns empty list).
- The armor detail block shows an explanatory label ("Unarmored — AC = 10 + DEX [+ CON/WIS]") when no armor is selected.

### H1 — `calcAC` now handles Barbarian and Monk unarmored defense
**File:** `src/lib/rules.ts` *(fixed in prior session)*

The function already had the fix applied. Callers were updated this session:

**File:** `src/app/characters/new/step5/page.tsx`
- AC preview passes `{ classKey, conScore, wisScore }` opts to `calcAC`.

**File:** `src/app/characters/new/step6/page.tsx`
- `handleSave` passes the same opts so the correct AC is saved to DB.

### H2 — Sailor background added
**File:** `src/lib/backgrounds.ts` *(fixed in prior session)*

### H3 — DB `ac` column kept current on equipment change
**File:** `src/components/character-sheet/EquipmentPanel.tsx`

- Added `ac` (already computed locally) to the `patch` object in `scheduleSave`.
- The `armor_class` generated column auto-follows since it is `GENERATED ALWAYS AS (ac) STORED`.
- Comment updated to clarify the distinction between `ac` (write this) and `armor_class` (never write this).

### M1 — Background personality trait/ideal/bond/flaw suggestions
**File:** `src/lib/backgrounds.ts` *(data added in prior session)*
**File:** `src/app/characters/new/step6/page.tsx`

- Two helpers (`appendSuggestion`, `SuggestionChips`) are defined before the `return (...)` statement.
- Below each textarea (Personality Traits, Ideals, Bonds, Flaws), clickable pill chips from the selected background's suggestion arrays are shown.
- Clicking a chip appends the text to the field (newline-separated if the field already has content).
- When no background has suggestions (or none selected) the chip row simply doesn't render.

### M2 — Feat library + structured feat select in character creation
**File:** `src/lib/feats.ts` *(created in prior session)*
**File:** `src/app/characters/new/step3/page.tsx`

- The free-text `<input>` for feat names is replaced with a `<select>` over `FEAT_LIST` (all 40+ SRD feats, sorted alphabetically).
- Each option shows the feat name and, where applicable, a parenthetical prerequisite.
- Selecting a feat shows its summary and prerequisite in a styled callout beneath the select.

### L1 — HP calculation consolidated to canonical library
**File:** `src/app/characters/new/step6/page.tsx`

- Removed the three inline functions: `hitDieForClass`, `averageHpPerLevel`, `calcMaxHp`.
- Added `import { calcMaxHp } from '@/lib/hitPoints'` — the canonical source of truth.

### L2 — `extraWeaponKeys` consolidated to `equipmentRules.ts`
**File:** `src/lib/equipmentRules.ts`

- Added `extraWeaponKeys?: string[]` to the `CLASS_PROFS` type.
- Populated for Bard (`rapier`, `longsword`, `shortsword`, `hand_crossbow`), Rogue (`rapier`, `shortsword`, `longbow`, `hand_crossbow`), and Monk (`shortsword`).
- `classCanUseWeapon` now checks `extraWeaponKeys` before falling back to group matching.
- `step5/page.tsx` already had its own copy of these keys. Both are now in sync (step5 keeps its own copy for the creation-time filter; the live sheet uses `equipmentRules.ts`).

### L3 — Background feature shows name **and** summary
**File:** `src/app/characters/new/step2/page.tsx`

- Replaced the dead `typeof === 'string'` ternary with:
  ```tsx
  <strong>{feature.name}:</strong> {feature.summary}
  ```
- Both name and summary now display correctly for all 13 backgrounds.

---

## Files Changed

| File | Bugs fixed |
|------|-----------|
| `src/lib/rules.ts` | H1 |
| `src/lib/backgrounds.ts` | H2, M1 |
| `src/lib/feats.ts` (new) | M2 |
| `src/lib/equipmentRules.ts` | L2 |
| `src/app/characters/new/step2/page.tsx` | L3 |
| `src/app/characters/new/step3/page.tsx` | M2 UI |
| `src/app/characters/new/step5/page.tsx` | C1, M3, H1 caller |
| `src/app/characters/new/step6/page.tsx` | C1 caller, H1 caller, L1, M1 UI |
| `src/components/character-sheet/EquipmentPanel.tsx` | H3 |

## Validation

`npx tsc --noEmit` — **0 errors**.
