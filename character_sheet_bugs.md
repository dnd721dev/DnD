# Character Sheet — Bug Report

Derived from `character_sheet_audit.md`. Ordered by priority. **No code has been changed yet — awaiting approval.**

---

## CRITICAL

### Bug C1 — Unarmored classes (Monk, Wizard, Sorcerer) start with Breastplate equipped

**Files:** `src/app/characters/new/step5/page.tsx`, `src/app/characters/new/step6/page.tsx`

**Root cause:** Step 5 filters the armor dropdown by class proficiency. For classes with `armor: ['none']` (Monk, Wizard, Sorcerer), the filtered list is empty. The default armor key then falls back to `allArmors[0]?.key` (Breastplate, the first armor alphabetically). Step 6 saves this bad key to the DB.

**Effect:**
- A level-1 Monk with DEX 16 (+3) and WIS 14 (+2) should have AC **15** (10+3+2). Instead they get AC **16** (14 base breastplate + 2 max DEX), or higher if they happened to get splint/plate-range armor.
- The Breastplate is added to the monk's inventory.
- The live character sheet then reads `armor_key = 'breastplate'` from DB and displays the wrong (higher) AC.
- Saving a new character as Monk/Wizard/Sorcerer has always produced incorrect AC and inventory.

**Fix:** In step 5, when `classArmorOptions` is empty (or `prof.armor === 'none'`), set `armorKey = null` (or `''`) instead of falling back to `allArmors[0]`. Add a "No armor" `<option value="">Unarmored</option>` to the step 5 armor select. In step 6 `handleSave`, compute AC using class-aware logic (pass `classKey` to `calcAC` or use `computeArmorClass` instead).

---

## HIGH

### Bug H1 — `calcAC` ignores Barbarian and Monk unarmored defense

**File:** `src/lib/rules.ts`

**Root cause:** `calcAC` computes unarmored AC as `10 + dexMod` for all classes. It does not branch on `classKey`.

```ts
if (!armorKey) return 10 + dexMod + shieldBonus  // ← same for barbarian, monk, everyone
```

**Correct formulas:**
- Barbarian unarmored: 10 + DEX + CON
- Monk unarmored: 10 + DEX + WIS
- Everyone else: 10 + DEX

**Effect:** Step 5 "Computed AC" preview shows wrong AC for a barbarian or monk who chose no armor. Step 6 saves the wrong `ac` to the DB for unarmored barbarians/monks. The live character sheet (`computeArmorClass`) is correct; the DB `ac` column is not.

**Fix:** Add a `classKey?: string` parameter to `calcAC` in `rules.ts` and add the barbarian/monk branches, matching the logic already in `computeArmorClass`.

---

### Bug H2 — Sailor background missing

**File:** `src/lib/backgrounds.ts`

**Root cause:** The `BackgroundKey` union, `BACKGROUNDS` record, and `BACKGROUND_LIST` array all contain only 12 entries. Sailor — one of the 13 SRD backgrounds — is absent.

**SRD Sailor data:**
- Skill proficiencies: Athletics, Perception
- Tool proficiencies: Navigator's tools, Vehicles (water)
- Extra language choices: 0
- Equipment: Belaying pin, 50 ft. silk rope, lucky charm, set of common clothes, 10 gp
- Feature: Ship's Passage — secure free passage on sailing ships for you and party
- Ability score modifiers (2024-style): STR +2, DEX +1 (or similar — verify with SRD)

**Fix:** Add `sailor` to `BackgroundKey`, add the Sailor object to `BACKGROUNDS`, and add it to `BACKGROUND_LIST` in alphabetical position (after Sage, before Soldier).

---

### Bug H3 — DB `ac` column becomes stale after equipment change

**File:** `src/components/character-sheet/EquipmentPanel.tsx`

**Root cause:** When the user equips different armor, `EquipmentPanel` saves `armor_key`, `equipment_items`, `inventory_items` to the DB but does NOT update `ac`. Since `armor_class` is `GENERATED ALWAYS AS (ac) STORED`, it also stays stale. The live sheet is correct (reads `armor_key` dynamically through `computeArmorClass`), but:
- The DB `ac` column drifts from the actual equipped-armor AC after any change
- `armor_class` similarly drifts
- Any page that reads `armor_class` directly from the DB (e.g., a session player list) shows stale AC

**Fix options:**
1. (**Preferred**) Add a Postgres trigger or computed expression to update `ac` whenever `armor_key` or `equipment_items` changes. However this requires pushing armor formula logic into SQL.
2. Include `ac` in the `EquipmentPanel` DB patch. Compute it locally (as the panel already does) and write it to `ac`. This means removing the generated column `armor_class` and replacing it with a regular column updated by the app.

The simplest fix is Option 2: drop the generated `armor_class` column, add a regular `armor_class` column, and in `EquipmentPanel.scheduleSave` include `ac` in the UPDATE patch (already computed locally as `ac`).

---

## MEDIUM

### Bug M1 — Background type missing personality trait / ideal / bond / flaw tables

**File:** `src/lib/backgrounds.ts`

**Root cause:** The `Background` type has no `personalityTraits`, `ideals`, `bonds`, or `flaws` fields. In the 5e SRD, each background provides a table of 8 personality traits, 6 ideals, 6 bonds, and 6 flaws. Step 6 provides only blank free-text inputs with no prompts or options from the chosen background.

**Effect:** Players get no guided personality suggestions based on their background. A new Sage character just sees empty text areas instead of "Choose from: 1. I use polite euphemisms…" etc.

**Fix:**
1. Add optional arrays to `Background`:
   ```ts
   personalityTraits?: string[]   // up to 8 entries
   ideals?: string[]              // up to 6 entries
   bonds?: string[]               // up to 6 entries
   flaws?: string[]               // up to 6 entries
   ```
2. Populate them for each of the 12 existing backgrounds (original text, not literal SRD copy).
3. In step 6, when `backgroundKey` is set, show the background's trait/ideal/bond/flaw options alongside the free-text areas so the player can click-to-fill.

---

### Bug M2 — No feat definitions library; feat selection is freetext

**File:** `src/app/characters/new/step3/page.tsx`, `src/lib/` (missing file)

**Root cause:** There is no `FEATS` record or feat definitions anywhere in the codebase. In step 3, taking a feat is just:
```html
<input type="text" placeholder="e.g. War Caster, Sentinel, Lucky…" />
```

The feat name is stored as a string in `characters.feats[]`. There is no mechanical effect, no prereq check, and no description shown on the sheet.

**Fix:**
1. Create `src/lib/feats.ts` with a `FEAT` record containing at minimum: `key`, `name`, `prerequisite` (if any), `summary`. Start with SRD feats: Alert, Athlete, Actor, Charger, Crossbow Expert, Defensive Duelist, Dual Wielder, Dungeon Delver, Durable, Elemental Adept, Grappler, Great Weapon Master, Healer, Heavily Armored, Heavy Armor Master, Inspiring Leader, Keen Mind, Lightly Armored, Linguist, Lucky, Mage Slayer, Magic Initiate, Martial Adept, Medium Armor Master, Mobile, Moderately Armored, Mounted Combatant, Observant, Polearm Master, Resilient, Ritual Caster, Savage Attacker, Sentinel, Sharpshooter, Shield Master, Skilled, Skulker, Spell Sniper, Tavern Brawler, Tough, War Caster, Weapon Master.
2. In step 3, replace the text input with a searchable `<select>` or autocomplete over `FEAT_LIST`.
3. Optionally: apply mechanical effects (e.g., Tough adds 2 HP per level) in `deriveStats` or a similar pipeline.

---

### Bug M3 — Monk/Wizard/Sorcerer step-5 armor dropdown is empty with no "Unarmored" option

**File:** `src/app/characters/new/step5/page.tsx`

**Root cause:** For unarmored classes, the armor `<select>` renders with zero `<option>` elements. There's no "No armor / Unarmored" option and no label explaining why the select is blank.

**Effect:** The UI is confusing — the dropdown appears broken. The draft keeps an invalid `armorKey` (fallback to `allArmors[0]`, see Bug C1).

**Fix:** Add a leading `<option value="">No armor (Unarmored)</option>` to the armor select, always. For classes that can't wear armor, make this the only available option and pre-select it. Clear `draft.armorKey` to `null` in these cases.

---

## LOW

### Bug L1 — Step 6 duplicates HP calculation logic instead of importing the library

**File:** `src/app/characters/new/step6/page.tsx`

**Root cause:** Step 6 contains inline copies of `hitDieForClass`, `averageHpPerLevel`, and `calcMaxHp` functions. The canonical versions live in `src/lib/hitPoints.ts`. The inline versions don't support `method: 'max'` (roll maximum on level-up). If the HP formula is ever changed in `hitPoints.ts`, step 6 won't pick it up.

**Fix:** Remove the three inline functions from step 6 and replace with:
```ts
import { calcMaxHp } from '@/lib/hitPoints'
```

---

### Bug L2 — `CLASS_PROFS` duplicated across step5, EquipmentPanel, and equipmentRules.ts; Bard/Rogue weapon exceptions inconsistent

**Files:** `src/app/characters/new/step5/page.tsx`, `src/lib/equipmentRules.ts`

**Root cause:** Three independent copies of class proficiency data. Step 5 includes `extraWeaponKeys` for Bard (`rapier`, `longsword`, `shortsword`, `hand_crossbow`) and Rogue (`rapier`, `shortsword`, `longbow`, `hand_crossbow`) that `equipmentRules.ts` does not. This means a Bard can pick `longsword` at character creation but the "Add item" library in `EquipmentPanel` later won't offer it.

**Fix:** Consolidate to one source of truth in `equipmentRules.ts`. Move `extraWeaponKeys` there. Have step 5 and `EquipmentPanel` both import from `equipmentRules.ts`.

---

### Bug L3 — Background feature in step 2 has dead `typeof === 'string'` branch

**File:** `src/app/characters/new/step2/page.tsx`

**Root cause:**
```tsx
{typeof selectedBackground.feature === 'string'
  ? selectedBackground.feature                     // ← dead branch; feature is always an object
  : (selectedBackground.feature as any)?.description ??
    (selectedBackground.feature as any)?.name ??
    JSON.stringify(selectedBackground.feature)}    // ← always reached
```

Since `Background.feature` is typed as `BackgroundFeature { name: string; summary: string }`, the string branch never fires. The fallback chain reads `.description` (doesn't exist) then `.name`. This means only the feature name is shown, not the summary.

**Fix:** Replace the entire ternary with:
```tsx
<p className="text-[11px] text-slate-400">
  <strong>{selectedBackground.feature.name}:</strong> {selectedBackground.feature.summary}
</p>
```

---

## Files to Change

| Bug | File(s) | Action |
|-----|---------|--------|
| C1 | `step5/page.tsx`, `step6/page.tsx` | Fix unarmored class default armor key; add "Unarmored" option |
| H1 | `src/lib/rules.ts` | Add `classKey` param + barbarian/monk branches to `calcAC` |
| H2 | `src/lib/backgrounds.ts` | Add Sailor background |
| H3 | `EquipmentPanel.tsx` + migration | Include `ac` in equipment UPDATE; rework `armor_class` column |
| M1 | `src/lib/backgrounds.ts`, `step6/page.tsx` | Add trait/ideal/bond/flaw fields; add picker UI in step 6 |
| M2 | new `src/lib/feats.ts`, `step3/page.tsx` | Create feat library; replace text input with autocomplete |
| M3 | `step5/page.tsx` | Add "No armor" option to armor select for unarmored classes |
| L1 | `step6/page.tsx` | Import `calcMaxHp` from `hitPoints.ts`, remove duplicates |
| L2 | `equipmentRules.ts`, `step5/page.tsx` | Consolidate CLASS_PROFS to one source |
| L3 | `step2/page.tsx` | Fix background feature display to show name + summary |
