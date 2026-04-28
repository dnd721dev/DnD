# Character Sheet — Comprehensive Audit

Files read: `src/lib/backgrounds.ts`, `src/components/character-sheet/calc.ts`,
`src/components/character-sheet/equipment-calc.ts`, `src/lib/hitPoints.ts`,
`src/components/character-sheet/CombatStatsPanel.tsx`, `src/components/character-sheet/types.ts`,
`src/lib/armor.ts`, `src/components/character-sheet/AbilitiesPanel.tsx`,
`src/components/character-sheet/TraitsFeaturesPanel.tsx`, `src/components/character-sheet/EquipmentPanel.tsx`,
`src/lib/equipment.ts`, `src/lib/equipmentRules.ts`, `src/lib/proficiencies.ts`,
`src/types/character.ts`, `src/types/characterDraft.ts`, `src/lib/features.ts` (partial),
`src/lib/rules.ts`, `src/app/characters/new/step2/page.tsx`, `src/app/characters/new/step3/page.tsx`,
`src/app/characters/new/step5/page.tsx`, `src/app/characters/new/step6/page.tsx`,
`src/app/characters/[id]/page.tsx` (partial),
`supabase/migrations/011_character_sheet_columns.sql`

---

## Section A — Backgrounds

### A1. Which backgrounds are defined?

`src/lib/backgrounds.ts` defines 12 backgrounds:

| Key | Name |
|-----|------|
| `acolyte` | Acolyte |
| `charlatan` | Charlatan |
| `criminal` | Criminal / Spy |
| `entertainer` | Entertainer |
| `folkHero` | Folk Hero |
| `guildArtisan` | Guild Artisan |
| `hermit` | Hermit |
| `noble` | Noble |
| `outlander` | Outlander |
| `sage` | Sage |
| `soldier` | Soldier |
| `urchin` | Urchin |

### A2. Which SRD background is missing?

**Sailor is missing.** The 5e SRD lists 13 backgrounds:
Acolyte, Charlatan, Criminal, Entertainer, Folk Hero, Guild Artisan, Hermit, Noble, Outlander, Sage, **Sailor**, Soldier, Urchin.

`BackgroundKey`, `BACKGROUNDS`, and `BACKGROUND_LIST` all have 12 entries. Sailor appears nowhere.

### A3. Do all 12 existing backgrounds have required data?

Checking against SRD expectations for each field:

| Background | Skill Profs | Tool Profs | Languages | Equipment | Feature | Ability Mods |
|-----------|-------------|------------|-----------|-----------|---------|-------------|
| Acolyte | insight, religion ✓ | none ✓ | +2 choices ✓ | ✓ | Shelter of the Faithful ✓ | wis+2, int+1 ✓ |
| Charlatan | deception, sleightOfHand ✓ | disguise kit, forgery kit ✓ | none ✓ | ✓ | False Identity ✓ | cha+2, dex+1 ✓ |
| Criminal | deception, stealth ✓ | gaming set, thieves' tools ✓ | none ✓ | ✓ | Criminal Contact ✓ | dex+2, int+1 ✓ |
| Entertainer | acrobatics, performance ✓ | disguise kit, instrument ✓ | none ✓ | ✓ | By Popular Demand ✓ | cha+2, dex+1 ✓ |
| Folk Hero | animalHandling, survival ✓ | artisan's tools, vehicles (land) ✓ | none ✓ | ✓ | Rustic Hospitality ✓ | wis+2, con+1 ✓ |
| Guild Artisan | insight, persuasion ✓ | artisan's tools ✓ | +1 choice ✓ | ✓ | Guild Membership ✓ | cha+2, int+1 ✓ |
| Hermit | medicine, religion ✓ | herbalism kit ✓ | +1 choice ✓ | ✓ | Discovery ✓ | wis+2, con+1 ✓ |
| Noble | history, persuasion ✓ | gaming set ✓ | +1 choice ✓ | ✓ | Position of Privilege ✓ | cha+2, int+1 ✓ |
| Outlander | athletics, survival ✓ | musical instrument ✓ | +1 choice ✓ | ✓ | Wanderer ✓ | str+2, wis+1 ✓ |
| Sage | arcana, history ✓ | none ✓ | +2 choices ✓ | ✓ | Researcher ✓ | int+2, wis+1 ✓ |
| Soldier | athletics, intimidation ✓ | gaming set, vehicles (land) ✓ | none ✓ | ✓ | Military Rank ✓ | str+2, con+1 ✓ |
| Urchin | sleightOfHand, stealth ✓ | disguise kit, thieves' tools ✓ | none ✓ | ✓ | City Secrets ✓ | dex+2, int+1 ✓ |

All 12 existing backgrounds are internally complete.

### A4. Does the `Background` type include personality traits, ideals, bonds, or flaws?

**No.** The `Background` type only has:
```ts
{
  key, name, skillProficiencies, toolProficiencies,
  extraLanguageChoices, startingEquipment, feature, abilityScoreModifiers
}
```

There are no `personalityTraits: string[]`, `ideals: string[]`, `bonds: string[]`, or `flaws: string[]` fields.
In 5e SRD, each background provides 8 personality trait options, 6 ideals, 6 bonds, and 6 flaws for the player to roll or choose from.

### A5. How is background rendered in character creation?

**Step 2 (`step2/page.tsx`)**:
- Background selected via `<select>` dropdown populated by `BACKGROUND_LIST`
- Below the select, shows `selectedBackground.feature` description
- No personality trait tables shown; no ideals/bonds/flaws prompts at this step

**Step 6 (`step6/page.tsx`)**:
- Provides free-text `<textarea>` for Personality Traits, Ideals, Bonds, Flaws, Notes
- These are blank — there are no background-provided defaults or prompts
- Saved to DB columns `personality_traits`, `ideals`, `bonds`, `flaws`

### A6. How is background rendered on the live character sheet?

`TraitsFeaturesPanel.tsx` looks up `bgFromLib = BACKGROUNDS[bgKey]` and displays:
- `bgFromLib.feature.name` + `bgFromLib.feature.summary` in the "Background Feature" section
- `bgFromLib.toolProficiencies` in the "Tool Proficiencies" section
- `bgFromLib.skillProficiencies` is NOT displayed here (shown in the Skills panel instead)
- No personality traits / ideals / bonds / flaws displayed (not stored on `Background` type)

---

## Section B — Feat Selection

### B1. Where does feat selection live in character creation?

**Step 3 (`step3/page.tsx`) — ASI / Feat section**, gated on:
```ts
const asiCount = asiSlotsForClassLevel(currentDraft.classKey ?? 'fighter', currentDraft.level ?? 1)
if (asiCount === 0) return null  // section hidden entirely
```

`asiSlotsForClassLevel` uses only `classKey` and `level`. The background is **not consulted at all** in step 3.

When `asiCount > 0`, each slot shows three radio-style options:
- **+2 to one stat** — select dropdown, saves to `draft.asiChoices[i] = { type: 'plus2', ability1 }`
- **+1/+1 to two stats** — two dropdowns, saves `{ type: 'plus1plus1', ability1, ability2 }`
- **Take a Feat** — plain `<input type="text">` placeholder "e.g. War Caster, Sentinel, Lucky…"

There is **no feat library, no validation, no prereq check**. The feat name is stored as a freetext string.

### B2. Why does Sage "block" feat selection?

There is **no code path where the Sage background blocks feat selection**. Tracing the flow:

1. Step 2 saves `draft.backgroundKey = 'sage'`
2. Step 3 ignores `backgroundKey` entirely
3. The ASI section renders based on `asiSlotsForClassLevel(classKey, level)` only

The apparent "blocking" is: **the default level is 1**, and no class earns any ASI at level 1. At level 1, `asiSlotsForClassLevel` returns 0 for every class → the ASI section is hidden. A new character with Sage background at level 1 simply shows no feat selection — which is correct D&D 5e rules. It feels like a block because the feat section is completely invisible.

To see feat selection, the user must set their character's level ≥ 4 in step 2.

Note: Sage gives `abilityScoreModifiers: { int: 2, wis: 1 }`. These are applied in step 6 on top of step 3's base abilities. They do not interact with the ASI/feat section at all.

### B3. Are feat definitions correct?

There is **no feat definitions library**. No `FEATS` record exists anywhere in the codebase. Feats are:
- Entered as free text at character creation (step 3)
- Saved to DB as `feats: string[]`
- Displayed on the character sheet as badge chips in `TraitsFeaturesPanel`
- No mechanical effect applied anywhere

---

## Section C — AC Calculation

### C1. What formula does `computeArmorClass` use?

File: `src/components/character-sheet/equipment-calc.ts`

**No armor / Unarmored:**
```
classKey === 'barbarian' → 10 + DEX + CON + shield
classKey === 'monk'      → 10 + DEX + WIS + shield
(everyone else)          → 10 + DEX + shield
```
Minimum 10 is enforced: `Math.max(10, ac)`.

**Armor equipped:**
- Reads `c.armor_key` → looks up in `ARMORS`
- `dexCap === null` → full DEX; `dexCap > 0` → DEX capped at dexCap; `dexCap === 0` → no DEX
- Shield: `+2 AC` if `c.equipment_items.includes('shield')` AND shield is in inventory

**All SRD armor types covered correctly** (padded through plate, all 12 entries in `ARMORS`).

**MISSING: Draconic Bloodline unarmored defense** (13 + DEX mod). The code has no `sorcerer/draconic` branch. This might be patched in `applySubclassToDerived` (not audited here).

### C2. Is AC reactive on equipment change?

Yes. `EquipmentPanel` calls `onSaved(patch)` which merges into `c` state in `characters/[id]/page.tsx`. Since `deriveStats(c, abilities)` is called in render and calls `computeArmorClass(c, abilities)`, the displayed AC updates immediately.

However, **the DB `ac` column is never updated** when equipment changes. `EquipmentPanel.scheduleSave` sends:
```ts
patch = { main_weapon_key, armor_key, equipment_items, inventory_items }
// 'ac' column is NOT in the patch
```
The comment explains: `armor_class` is `GENERATED ALWAYS AS (ac) STORED` — including it in UPDATE throws Postgres error. So the workaround is local React state only. **The DB `ac` and `armor_class` columns become stale after the first equipment change.**

### C3. Is `armor_class` a generated DB column?

**Yes.** From `011_character_sheet_columns.sql`:
```sql
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS armor_class INT GENERATED ALWAYS AS (ac) STORED;
```

`armor_class` always mirrors `ac`. It cannot be written directly; doing so throws "column can only be updated to DEFAULT."

`EquipmentPanel` correctly avoids writing `armor_class` to DB (line 327 comment confirms awareness).

### C4. Does `calcAC` in `rules.ts` handle unarmored defense?

**No.** `calcAC` (used in step 5 display preview and step 6 final INSERT):
```ts
if (!armorKey) return 10 + dexMod + shieldBonus
// No check for barbarian/monk/draconic sorcerer
```

`computeArmorClass` in `equipment-calc.ts` (used by the live sheet) DOES handle barbarian/monk.
`calcAC` in `rules.ts` does NOT.

This creates a split: the **live character sheet shows correct AC** (via `computeArmorClass`), but the **initial DB save** from step 6 uses `calcAC` and saves the wrong `ac` for barbarian/monk with no armor equipped.

### C5. What happens to unarmored-class characters in step 5?

For classes with `armor: ['none']` proficiency (Monk, Wizard, Sorcerer), step 5 filters all armor out:
```ts
const classArmorOptions = allArmors.filter((a) => classCanUseArmor(classKey, a))
// For monk/wizard/sorcerer → classArmorOptions = []
```

The default armor key falls back to:
```ts
const defaultArmorKey = classArmorOptions[0]?.key ?? (allArmors[0]?.key ?? 'padded')
// allArmors sorted by name → allArmors[0] = Breastplate (base AC 14)
```

**Monks, Wizards, and Sorcerers silently get `armorKey = 'breastplate'` assigned at creation.** This incorrect armor key is then:
- Included in the character's inventory (step 6 adds the selected armor to inventory)
- Saved as `armor_key = 'breastplate'` in the DB
- Used by `computeArmorClass` which reads `armor_key` → computes AC as 14 + DEX (max +2) for a monk instead of 10 + DEX + WIS

### C6. Does Cleric armor equip work correctly?

`equipmentRules.ts` gives Cleric `armor: ['light', 'medium', 'shields']` which matches 5e SRD. The armor dropdown in both step 5 and `EquipmentPanel` correctly shows light and medium armor. The AC calculation works correctly. ✓

---

## Section D — HP Calculation

### D1. What formula does `calcMaxHp` in `hitPoints.ts` use?

```ts
Level 1 HP = hitDie + conMod                           (max die, + CON mod)
Per level  = Math.floor(hitDie/2) + 1 + conMod        (average die + CON mod)
Total      = level1 + (level - 1) * (avg + conMod)
```

Examples at level 1 (CON 10, modifier 0):
- Barbarian (d12): 12 HP ✓
- Fighter/Paladin/Ranger (d10): 10 HP ✓
- Bard/Cleric/Druid/Monk/Rogue/Warlock (d8): 8 HP ✓
- Sorcerer/Wizard (d6): 6 HP ✓

At level 5 (CON 14, modifier +2):
- Fighter (d10): 10+2 + 4×(6+2) = 12 + 32 = 44 HP ✓
- Wizard (d6): 6+2 + 4×(4+2) = 8 + 24 = 32 HP ✓

Formula is correct per 5e SRD.

### D2. Does `deriveStats` recalculate HP?

**No.** `deriveStats` reads HP from the DB:
```ts
let hpMax = c.hit_points_max ?? (c as any).hp ?? 0
```

HP is "locked in" at character creation time. It is not dynamically recalculated from abilities on the character sheet.

### D3. Is HP set correctly at character creation?

Step 6 calculates HP with an inline `calcMaxHp` function (separate from `src/lib/hitPoints.ts`) and saves it:
```ts
hp: computedMaxHp,
hit_points_current: computedCurrentHp,
hit_points_max: computedMaxHp,
```

The step 6 inline formula is **mathematically equivalent** to `hitPoints.ts` for the default 'average' method. ✓

### D4. What happens if CON score is edited after character creation?

If a user somehow changes their CON score post-creation, `hpMax` in the DB does NOT update. The character sheet panel (which reads `d.hpMax` from `deriveStats`) would continue to show the old HP. This is an intentional design (HP is only recalculated on level-up in 5e), but there is no level-up HP recalculation flow implemented.

### D5. Is current HP tracked separately from max HP?

Yes. `hit_points_current` and `hit_points_max` are separate columns. `CombatStatsPanel` displays both and provides Heal/Dmg buttons that call `onAdjustHp(delta)`. The character page applies the delta and persists it to `hit_points_current`. ✓

### D6. Is temp HP tracked?

Yes. `temp_hp` column added by migration 011. `CombatStatsPanel` shows `tempHp` as a teal badge. `onSetTempHp` callback saves it to DB. ✓

### D7. Does step 6 duplicate HP logic instead of importing the library?

**Yes.** `step6/page.tsx` contains inline copies of `hitDieForClass`, `averageHpPerLevel`, and `calcMaxHp` instead of:
```ts
import { calcMaxHp } from '@/lib/hitPoints'
```

The inline version does not support `method: 'max'` (max die per level instead of average). For the default 'average' case the results are identical.

---

## Cross-Cutting Observations

### O1. Duplicate CLASS_PROFS tables

Three places define class weapon/armor proficiency tables:
1. `src/lib/equipmentRules.ts` — used by `EquipmentPanel` "Add item" library
2. `src/app/characters/new/step5/page.tsx` — used at character creation
3. `src/app/characters/new/step5/page.tsx` also has `extraWeaponKeys` for Bard/Rogue/Monk that `equipmentRules.ts` lacks

Impact: Bard, Rogue, and Monk see extra weapons (rapier, longsword, shortsword, hand_crossbow) during creation (step 5) but after creation the EquipmentPanel "Add item" library doesn't offer those martial weapons.

### O2. `calcAC` vs `computeArmorClass` split-brain

Two AC calculation functions:
- `src/lib/rules.ts → calcAC` — used in step5 (display) and step6 (initial DB save) — does NOT handle barbarian/monk unarmored defense
- `src/components/character-sheet/equipment-calc.ts → computeArmorClass` — used by live sheet — DOES handle barbarian/monk unarmored defense

The character sheet displays correct AC. The DB `ac` column starts wrong for barbarian/monk.

### O3. DB `ac` column is never updated after character creation

`EquipmentPanel` updates `armor_key` but not `ac`. Because `armor_class` is `GENERATED ALWAYS AS (ac)`, the DB `armor_class` is stale after any equipment change. The live character sheet is fine (reads `armor_key` dynamically), but any external consumer of `armor_class` from DB gets stale data.
