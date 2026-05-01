# DND721 — Character Creation Flow Audit
**Date:** 2026-04-30  
**Rules Target:** 2024 D&D 5e Player's Handbook  
**Scope:** Full flow from `src/app/characters/new/` through all lib files and the final Supabase save

---

## SECTION A — Flow Structure & Step Order

### A1. Current step order
| Step | Route | Content |
|------|-------|---------|
| 1 | `/new/step1` | Link NFT (optional) — maps metadata traits to draft |
| 2 | `/new/step2` | Basics — name, level, alignment, **class + subclass + race + background + languages** all on one page |
| 3 | `/new/step3` | Abilities — Base + Racial bonus + free "Bonus" input = Total; ASI/feat section for higher levels |
| 4 | `/new/step4` | Spellcasting — class spells + innate racial spells; skips for non-casters |
| 5 | `/new/step5` | Equipment — weapon, armor, adventuring pack (prof-filtered) |
| 6 | `/new/step6` | Personality + final save to Supabase |

### A2. 2024 PHB correct order
**Species → Class → Background → Ability Scores → Equipment → Spells → Review**

### A3. Critical deviations from 2024 order

**DEV-A1 (HIGH):** Class, species, and background are all on a single "Basics" step (step 2). In 2024 they are distinct choices with dependencies (Background → ASI; Class → equipment options; Subclass timing per class).

**DEV-A2 (HIGH):** Background is selected in step 2 but its ability score bonuses are invisible during step 3. They are applied silently inside `handleSave()` in step 6 only. Players have no visibility into the `+2/+1` they are entitled to when placing their base scores.

**DEV-A3 (MEDIUM):** No review/summary page before final save. Step 6 doubles as personality entry and save trigger.

**DEV-A4 (LOW):** Step 1 (NFT link) is not part of the 2024 character creation sequence — it is a DND721 platform addition. Its placement before basic choices is fine, but NFT-mapped ability scores bypass the standard array / point-buy step entirely (no validation guard).

### A4. Draft persistence mechanism
- `localStorage` under key `dnd721_character_draft` (via `loadDraft`/`saveDraft` from `@/lib/characterDraft`)
- `CharacterDraft` type defined in `src/types/characterDraft.ts`
- Synced to Supabase `character_drafts` table every 30 s via `useCharacterDraftSync` hook (called at layout level)
- On mount: if localStorage is empty, restores from Supabase (cross-device / tab recovery) ✓
- On `pagehide`: fires a final sync before tab close ✓
- `clearDraft(wallet)` removes localStorage and fires DELETE `/api/character-draft` after save ✓

### A5. Back navigation
Works correctly — the layout handles shared draft, and each step calls `saveDraft()` before navigating.

---

## SECTION B — Species (Race)

### B1. Species data source
`src/lib/races.ts` — 14 species total (7 subraces broken out as separate keys):
`dwarf_hill`, `dwarf_mountain`, `elf_high`, `elf_wood`, `elf_drow`, `halfling_lightfoot`, `halfling_stout`, `human_standard`, `dragonborn`, `gnome_forest`, `gnome_rock`, `half_elf`, `half_orc`, `tiefling`

### B2. Ability bonuses on species — critical rule mismatch

**2014 rule (what the code does):** Each `Race` has an `abilityBonuses: Record<AbilityKey, number>` field. These are applied in step 3 ("Racial" column) AND in `handleSave()` as `racialBonuses`.

**2024 rule (what should happen):** Species do NOT grant ability score increases. All +2/+1 bonuses come from the Background only. The `abilityBonuses` field on every race should be zeroed out or removed.

**DEV-B1 (CRITICAL):** `races.ts` still carries 2014 racial ability bonuses. Examples:
- Hill Dwarf: `con: +2, wis: +1`
- Mountain Dwarf: `str: +2, con: +2` (four total — especially broken)
- High Elf: `dex: +2, int: +1`
- Human: `str/dex/con/int/wis/cha: +1` each (six bonuses — worst of all)
- Tiefling: `int: +1, cha: +2`

These are being applied on top of the background's `+2/+1`. A human acolyte currently receives `+1` to all six abilities (human racial) PLUS `+2 wis, +1 int` (acolyte background) — **eight free ability score points** at level 1. A 2024 character should receive exactly `+2/+1` from background only.

### B3. Species traits
Displayed in step 2 as reminder text (via `race.traits` array). Not mechanically applied during creation. This is acceptable for a web platform — trait application is a table-time concern.

### B4. Innate spells
`race.innateSpells` used in step 4 to surface auto-granted spells and cantrip choices (e.g., High Elf picks one wizard cantrip, Forest Gnome gets Minor Illusion, Tiefling gets Thaumaturgy + Hellish Rebuke at 3 + Darkness at 5). The level-gate (`unlocksAtLevel`) is present in data but the UI in step 4 shows all at creation regardless of character level — minor issue.

### B5. Languages
Sourced from `race.languages` + `race.extraLanguageChoices` + `background.extraLanguageChoices`. Logic in step 2 is correct. Players choose extras from `LANGUAGE_LIST`.

---

## SECTION C — Classes & Subclasses

### C1. Class coverage
`src/lib/subclasses.ts` defines `ClassKey` with 13 classes: `barbarian`, `bard`, `cleric`, `druid`, `fighter`, `monk`, `paladin`, `ranger`, `rogue`, `sorcerer`, `warlock`, `wizard`, `artificer`. All 12 standard PHB classes plus Artificer are present. ✓

### C2. Subclass timing — critical rule mismatch

**DEV-C1 (HIGH):** Step 2 shows a subclass picker for **all** classes immediately at character creation, regardless of the level at which the subclass is actually chosen. The `CLASS_SUBCLASSES` map in `subclasses.ts` correctly lists all subclasses per class, but there is no `unlockLevel` enforced in the UI.

2024 PHB subclass unlock levels:
| Class | Subclass Unlock Level |
|-------|-----------------------|
| Barbarian | 3 |
| Bard | 3 |
| Cleric | 1 (Domain at creation) |
| Druid | 2 |
| Fighter | 3 |
| Monk | 3 |
| Paladin | 3 |
| Ranger | 3 |
| Rogue | 3 |
| Sorcerer | 1 (Origin at creation) |
| Warlock | 1 (Patron at creation) |
| Wizard | 3 (2024 moves this from 2) |
| Artificer | 3 |

A level-1 fighter should NOT have a subclass. A level-1 cleric/sorcerer/warlock MUST have one. Currently the UI lets anyone pick any subclass at any level.

### C3. Weapon Mastery (2024 only)

**DEV-C2 (HIGH):** 2024 PHB introduces Weapon Mastery — fighters, barbarians, paladins, and rangers (and more) gain the ability to choose specific weapons and apply a Mastery property (Cleave, Push, Graze, Nick, Slow, Topple, Sap, Vex). There is **no Weapon Mastery step or data structure** anywhere in the codebase. The `CharacterDraft` type has no `weaponMasteries` field. The weapons in `weapons.ts` have no `masteryProperty` field.

### C4. Class features display
`features.ts` has comprehensive level-by-level class features for all 12 classes (levels 1–20). `getClassFeaturesForLevel(classKey, level)` is available. These are displayed in step 2 as a preview. Not mechanically applied, which is acceptable.

### C5. Subclass rules
`subclassRules.ts` has machine-readable `SubclassEffect` types (proficiency grants, spell list expansions, resource tracking, flag-setting). Used for display and future sheet math. Not yet wired to automatically apply proficiencies during character creation.

### C6. Hit dice
`hitPoints.ts` has correct hit dice for all classes. `calcMaxHp()` correctly computes max HP at level 1 (full die + CON) and average per level thereafter. This is applied in step 6 `handleSave()`. ✓

### C7. Proficiency bonus
Not computed from level anywhere in the wizard steps. `CharacterDraft.proficiencyBonus` exists as an optional field but step 3 has a free number input for it. `handleSave()` in step 6 must compute this correctly. Should be `Math.floor((level - 1) / 4) + 2`.

---

## SECTION D — Backgrounds

### D1. Background coverage
`src/lib/backgrounds.ts` defines 13 backgrounds: `acolyte`, `charlatan`, `criminal`, `entertainer`, `folkHero`, `guildArtisan`, `hermit`, `noble`, `outlander`, `sage`, `sailor`, `soldier`, `urchin`. ✓

### D2. Ability score modifiers (2024 rule — present in data but not shown)

Each background correctly has `abilityScoreModifiers: Partial<Record<AbilityModKey, number>>` with a +2/+1 split ✓. Examples:
- Acolyte: `wis: +2, int: +1`
- Soldier: `str: +2, con: +1`
- Noble: `cha: +2, int: +1`
- Criminal: `dex: +2, int: +1`

**DEV-D1 (HIGH):** These values are NOT surfaced in step 3 during ability score assignment. The player assigns scores without knowing their `+2/+1`. The bonuses are only added in `handleSave()` in step 6 as:
```typescript
const finalStr = (baseAbilities.str) + (abilityBonuses.str) + (racialBonuses.str) + (bg.abilityScoreModifiers.str ?? 0) + asiTotal.str
```
This means a player picking scores in step 3 cannot see their final totals until save.

### D3. Origin feats — missing entirely

**DEV-D2 (CRITICAL):** In 2024 D&D 5e, **each background grants a specific Origin Feat** as part of character creation. These are not free-choice feats — they are prescribed:
- Acolyte → Magic Initiate (Cleric)
- Charlatan → Skilled or Actor (varies by PHB variant)
- Criminal → Alert or Tavern Brawler (varies)
- Soldier → Savage Attacker or Tavern Brawler (varies)
- (etc. — each background prescribes its origin feat)

The current `Background` type has only a `feature: BackgroundFeature` (name + summary string). There is **no `originFeatKey` or equivalent** on the background definition. The creation flow does not present origin feats. Players exit the wizard without their background-granted feat.

### D4. Skill proficiencies
`background.skillProficiencies: SkillKey[]` is present and applied in step 6's `handleSave()` when building the final `skillProficiencies` map. ✓

### D5. Tool proficiencies
`background.toolProficiencies: string[]` is present and applied in step 6. ✓

### D6. Starting equipment (background)
Background `startingEquipment: string[]` is a descriptive string array only — not linked to `GearKey` values. This is acceptable for now since step 5 handles the actual equipment selection.

---

## SECTION E — Ability Scores

### E1. Current method
Step 3 presents three columns per ability:
1. **Base** — from NFT metadata or a hardcoded default (e.g. all 10s)
2. **Racial** — from `race.abilityBonuses` (2014 rule — should be removed)
3. **Bonus** — free number input, no floor/ceiling enforced

**Total = Base + Racial + Bonus**

Background modifiers are nowhere on this page.

### E2. Missing generation methods

**DEV-E1 (HIGH):** No Standard Array offered (15, 14, 13, 12, 10, 8 distributed to six abilities). This is the default method in both 2014 and 2024 PHB.

**DEV-E2 (HIGH):** No Point Buy offered (27 points, scores 8–15 before bonuses). Required option in both editions.

**DEV-E3 (MEDIUM):** No dice rolling offered. Optional in both editions but expected by players.

**DEV-E4 (MEDIUM):** The free "Bonus" input has no validation — a player can enter 99 in every field. No score cap of 20 (or 15 before bonuses for point buy).

### E3. Background ASI visibility

**DEV-E5 (HIGH):** Background ability score bonuses (`+2/+1`) are not shown in step 3. Correct fix: show all four components (Base + Background + Racial → remove racial per 2024 + Free Bonus = Total) so players see the live total.

### E4. ASI/feat slots for higher-level characters
Step 3 calls `asiSlotsForClassLevel(classKey, level)` to determine how many ASI/feat choices the character should have. This is correct behavior. The ASI choices are stored in `draft.asiChoices[]` and applied in `handleSave()`. ✓

### E5. Ability modifiers
`abilityMod(score)` = `Math.floor((score - 10) / 2)` in `hitPoints.ts` ✓ and `abilityScoreToModifier(score)` in `skills.ts` ✓

---

## SECTION F — Origin Feats (Backgrounds)

### F1. What should happen (2024 PHB)
When a player selects a background, they automatically receive a specific **Origin Feat**. This is not player-chosen — it is tied to the background. Origin feats are a subset of the full feat list, including Alert, Magic Initiate, Skilled, Tavern Brawler, Tough, Healer, Lucky, Savage Attacker, and others.

The background defines both:
- Ability score increases (+2/+1, player may redistribute within limits)
- A specific origin feat (no choice — comes with the background)

### F2. Current state

**DEV-F1 (CRITICAL):** The `Background` type does not have an `originFeatKey: FeatKey` field. No background definition includes a prescribed feat. The `feature: BackgroundFeature` is a flavor/narrative text field only, not a mechanical feat grant.

**DEV-F2 (CRITICAL):** There is no step in the creation flow for origin feats. The `CharacterDraft` type has `asiChoices[]` for ASI/feat upgrades at higher levels, but no `originFeat` field for the level-1 background-granted feat.

### F3. Impact
Every character created via this wizard is missing their background origin feat. This is a significant rules gap — origin feats are core to 2024 character power (e.g., a Soldier character should start with Savage Attacker; a Sage should start with Magic Initiate (Wizard)).

### F4. Existing feat data
`src/lib/feats.ts` contains all the relevant feats (`alert`, `lucky`, `savage_attacker`, `magic_initiate`, `skilled`, `tavern_brawler`, `tough`, `healer`, etc.). The data exists — it just isn't linked to backgrounds.

---

## SECTION G — Equipment

### G1. What step 5 does
- Shows weapons filtered by `CLASS_PROFS[classKey]` (simple/martial proficiency)
- Shows armor filtered by class armor proficiency
- Shows adventuring packs (7 options from `PACKS`)
- Computes a live AC preview
- Saves `packKey`, `mainWeaponKey`, `armorKey` to draft
- `equipmentItems` array is built from pack contents + chosen weapon/armor

### G2. Equipment Option A / Option B — missing

**DEV-G1 (HIGH):** 2024 PHB presents two equipment paths at character creation:
- **Option A:** A specific list of starting items defined by the class (e.g., Fighter: chain mail, a martial weapon, a shield, two handaxes, and a dungeoneer's pack OR a longsword and an explorer's pack)
- **Option B:** Starting gold to purchase gear (e.g., Fighter: 175 gp)

The current step 5 has neither. It lets the player pick any one weapon (prof-filtered), any one armor (prof-filtered), and one adventuring pack. This is a simplified subset that doesn't match either official option. Many class-specific starting items (shield, holy symbol, spellbook, thieves' tools) are not offered.

**DEV-G2 (MEDIUM):** No starting gold option. Players cannot choose Option B (gold purchase).

### G3. Weapon data
`weapons.ts` has a complete 5e SRD weapon table (simple + martial, melee + ranged). All properties modeled (`finesse`, `versatile`, `light`, `heavy`, `thrown`, `ammunition`, `loading`, `reach`, `twoHanded`, `special`). ✓

**DEV-G3 (MEDIUM):** No `masteryProperty` field on weapons (needed for 2024 Weapon Mastery system — see DEV-C2).

### G4. Armor data
`armor.ts` has all 5e SRD armor (light/medium/heavy + shield) with correct AC formulas (baseAc, dexCap) and strength requirements. `getArmorAcFromDex()` helper is correct. ✓

### G5. Pack data
`equipment.ts` has 7 standard packs (Burglar's, Diplomat's, Dungeoneer's, Entertainer's, Explorer's, Priest's, Scholar's). Minor issues: several packs reference items like `'ballOfSand' as any`, `'candle' as any`, `'chest10' as any` that are not in `GearKey`. These are placeholder casts that will silently fail if resolved. Not critical but should be fixed.

---

## SECTION H — Spellcasting

### H1. Class spell slots
`spellcastingProgression.ts` has correct slot tables for:
- Full casters (bard, cleric, druid, sorcerer, wizard): levels 1–20 ✓
- Half casters (paladin, ranger): levels 1–20 (starts at level 2) ✓
- Artificer (half caster starting level 1): levels 1–20 ✓
- Third casters (for Eldritch Knight/Arcane Trickster subclasses): levels 1–20 ✓
- Warlock pact magic: separate `WARLOCK_PACT_MAGIC` table ✓

### H2. Innate spells from species
Step 4 surfaces `race.innateSpells.auto[]` (always-granted spells with optional `unlocksAtLevel`) and `race.innateSpells.cantripChoiceFrom` (e.g., High Elf picks 1 wizard cantrip). Cantrip choice saved to `draft.racialCantripChoice`. ✓

**DEV-H1 (LOW):** Level-gated innate spells (e.g., Tiefling's Hellish Rebuke at level 3) are shown regardless of character level. A level-1 Tiefling should only see Thaumaturgy. Minor UX issue.

### H3. Spells known/prepared
Step 4 allows selecting class spells filtered by `SpellClass` and max spell level. Saved to `draft.knownSpells` and `draft.preparedSpells`. The `usedSlots` counter in step 4 is local state only (for preview) — does not persist. ✓ (appropriate for a builder)

### H4. Non-casters
Step 4 correctly auto-advances to step 5 for non-casting classes (barbarian, fighter, monk, rogue). ✓

### H5. Spell save DC / attack bonus
Computed in step 6 `handleSave()`:
- Save DC = 8 + proficiency + casting ability mod
- Attack bonus = proficiency + casting ability mod
Applied to character sheet data on save. ✓

---

## SECTION I — NFT Integration

### I1. Step 1 NFT flow
- Fetches owned NFTs from `/api/nft?owner={address}`
- Maps NFT metadata traits to draft:
  - `class` trait → `draft.classKey`
  - `race` trait → `draft.raceKey`
  - Ability score traits → `draft.baseAbilities`
  - `name` trait → `draft.name`
  - Image → `draft.avatar_url`
- `draft.nft_contract` and `draft.nft_token_id` track the linked NFT
- `draft.is_caya` flag for Caya-type NFTs

### I2. NFT bypasses generation methods

**DEV-I1 (MEDIUM):** When an NFT pre-fills ability scores, the step 3 "Base" column shows those values directly. There is no validation that the NFT-provided scores are legal (e.g., total ≤ 72 for standard array, or within point-buy constraints). A platform decision, but worth noting.

### I3. Character types
`src/types/character.ts` defines the DB-stored `Character` type. Key fields: `id`, `wallet_address`, `name`, `race`, `main_job` (class), `level`, `ac`, `proficiency`, `abilities`, `hit_points_current`, `hit_points_max`, plus optional `background`, `equipment`, `saving_throw_profs`, `languages`, `skill_proficiencies`. ✓

### I4. NFT fields
`nft_contract`, `nft_token_id`, `avatar_url` are in both `CharacterDraft` and `Character`. Linked correctly through step 1 → step 6 → Supabase. ✓

---

## SECTION J — Bug Report (Prioritized)

### BUG-1 [CRITICAL] — Racial ability bonuses still applied (2014 rule)
**File:** `src/lib/races.ts`, `src/app/characters/new/step3/page.tsx`, `src/app/characters/new/step6/page.tsx`  
**Issue:** Every race carries `abilityBonuses` from 2014 5e. These are displayed in step 3 and added in `handleSave()`. In 2024, species grant no ability bonuses.  
**Fix:** Zero out all `abilityBonuses` on `RACES` entries, remove the "Racial" column from step 3 display, remove `racialBonuses` from `handleSave()` computation.

### BUG-2 [CRITICAL] — Origin feats not granted by backgrounds
**File:** `src/lib/backgrounds.ts`, `src/app/characters/new/step2/page.tsx` or new step, `src/types/characterDraft.ts`  
**Issue:** 2024 backgrounds grant a specific Origin Feat automatically. No `originFeatKey` field exists on `Background`. No step presents origin feats. Characters are created without their background feat.  
**Fix:** Add `originFeatKey: FeatKey` to each `Background` definition. Add `originFeat?: string` to `CharacterDraft`. Auto-apply the feat when a background is selected. Show the granted feat in the UI. Apply in `handleSave()`.

### BUG-3 [HIGH] — Background ASI not visible in step 3
**File:** `src/app/characters/new/step3/page.tsx`  
**Issue:** The `+2/+1` from the selected background is not shown during ability score assignment. Players cannot see their final totals while allocating scores.  
**Fix:** Import `getBackground(draft.backgroundKey)` in step 3. Show a "Background" column (or add to the running total). Ideally: Base + Background + Free Bonus = Total (with racial column removed per BUG-1).

### BUG-4 [HIGH] — Subclass timing not enforced
**File:** `src/app/characters/new/step2/page.tsx`  
**Issue:** The subclass picker appears for all classes regardless of level. A level-1 fighter should see no subclass picker. A level-1 cleric/sorcerer/warlock must choose one.  
**Fix:** Add a `subclassUnlockLevel: Record<ClassKey, number>` map. Only show the subclass picker if `draft.level >= unlockLevel`. Cleric/Sorcerer/Warlock unlock at 1, most others at 3.

### BUG-5 [HIGH] — No Standard Array or Point Buy
**File:** `src/app/characters/new/step3/page.tsx`  
**Issue:** Only free numeric input exists. No Standard Array (15,14,13,12,10,8) or Point Buy (27 pts) method.  
**Fix:** Add a generation method selector: Standard Array | Point Buy | Free Entry. Standard Array: display 6 buttons (one score each) that the player assigns. Point Buy: enforce costs (8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9; max 27 pts).

### BUG-6 [HIGH] — No Weapon Mastery system
**File:** `src/lib/weapons.ts`, `src/types/characterDraft.ts`, `src/app/characters/new/step3/page.tsx` (or new step)  
**Issue:** 2024 PHB Weapon Mastery is entirely absent. Relevant classes (Barbarian, Fighter, Paladin, Ranger) do not select mastery weapons.  
**Fix (minimal scope):** Add `masteryProperty?: string` to `Weapon` type. Add `weaponMasteries?: string[]` to `CharacterDraft`. Add a mastery selection section in step 3 or step 5 for eligible classes. At character level 1, Fighter gets 2 masteries, Barbarian/Paladin/Ranger get 2 each.

### BUG-7 [HIGH] — No equipment Option A / Option B
**File:** `src/app/characters/new/step5/page.tsx`  
**Issue:** Class starting equipment lists (Option A) and starting gold (Option B) are both missing. Step 5 shows a generic prof-filtered picker that doesn't match any class's actual starting kit.  
**Fix:** Create a `CLASS_STARTING_EQUIPMENT: Record<ClassKey, { optionA: {...}, optionB: { gold: number } }>` data structure. In step 5, show Option A (click to select the full class kit) and Option B (gold amount shown, manual purchase in future sprint).

### BUG-8 [MEDIUM] — Background ASI not visible at any point in the wizard
See BUG-3 (same root, separate display concern — the `Background` panel in step 2 only shows `feature.name` and `feature.summary`, not the `abilityScoreModifiers` values).  
**Fix:** Show `+2 WIS / +1 INT` in the background card in step 2.

### BUG-9 [MEDIUM] — Equipment pack placeholder items use `as any` casts
**File:** `src/lib/equipment.ts`  
**Issue:** Burglar's Pack references `'ballOfSand' as any`, Diplomat's Pack references `'chest10' as any`, Entertainer's and Priest's Packs reference `'candle' as any`. These will silently fail when resolving items.  
**Fix:** Add `bagOfSand`, `chest`, and `candle` to `GearKey` and `GEAR`, or remove the placeholder entries.

### BUG-10 [MEDIUM] — Innate spells shown regardless of level gate
**File:** `src/app/characters/new/step4/page.tsx`  
**Issue:** Tiefling's Hellish Rebuke (`unlocksAtLevel: 3`) and Darkness (`unlocksAtLevel: 5`) are shown at level 1.  
**Fix:** In step 4, filter `race.innateSpells.auto` by `spell.unlocksAtLevel <= draft.level` (or `<= 1` if undefined).

### BUG-11 [LOW] — `proficiencyBonus` has no computed default
**File:** `src/app/characters/new/step3/page.tsx`  
**Issue:** Proficiency bonus is a free input in step 3. Should be auto-computed as `Math.floor((level - 1) / 4) + 2`.  
**Fix:** Remove the free input; display a computed read-only value based on `draft.level`.

### BUG-12 [LOW] — `CharacterDraft` has no `originFeat` field
**File:** `src/types/characterDraft.ts`  
**Issue:** No field to store the background-granted origin feat on the draft.  
**Fix:** Add `originFeat?: string` (the feat key) to `CharacterDraft`.

---

## SECTION K — Summary Matrix

| Priority | Bug | Files Affected | Effort |
|----------|-----|----------------|--------|
| CRITICAL | BUG-1: Remove racial ASI | `races.ts`, `step3`, `step6` | M |
| CRITICAL | BUG-2: Add origin feats to backgrounds | `backgrounds.ts`, `characterDraft.ts`, `step2`/new step, `step6` | L |
| HIGH | BUG-3: Show background ASI in step 3 | `step3` | S |
| HIGH | BUG-4: Enforce subclass unlock level | `step2` | S |
| HIGH | BUG-5: Standard Array / Point Buy | `step3` | M |
| HIGH | BUG-6: Weapon Mastery system | `weapons.ts`, `characterDraft.ts`, `step3` or `step5` | L |
| HIGH | BUG-7: Equipment Option A / B | `step5`, new data file | L |
| MEDIUM | BUG-8: Show bg ASI in step 2 background card | `step2` | S |
| MEDIUM | BUG-9: Fix equipment pack placeholder `as any` | `equipment.ts` | S |
| MEDIUM | BUG-10: Level-gate innate spells in step 4 | `step4` | S |
| LOW | BUG-11: Auto-compute proficiency bonus | `step3` | S |
| LOW | BUG-12: Add `originFeat` to `CharacterDraft` | `characterDraft.ts` | S |

---

## SECTION L — Proposed Fix Groups

### Group 1 — Data Definitions (no UI changes)
- BUG-12: Add `originFeat?: string` to `CharacterDraft` type
- BUG-9: Fix equipment pack placeholder items in `equipment.ts`
- BUG-1 (data layer): Zero racial `abilityBonuses` on all races in `races.ts`
- Add `originFeatKey: FeatKey` to `Background` type and fill in for all 13 backgrounds

### Group 2 — Ability Score Step (step3)
- BUG-1 (UI layer): Remove "Racial" column from step 3
- BUG-3: Add "Background" column showing bg modifiers from draft
- BUG-5: Add Standard Array and Point Buy methods
- BUG-11: Replace proficiency bonus input with computed value

### Group 3 — Origin Feat Auto-Grant (step2)
- BUG-2: When background selected, show granted origin feat in the UI; save to `draft.originFeat`
- BUG-8: Show `abilityScoreModifiers` values on the background card in step 2

### Group 4 — Subclass Timing (step2)
- BUG-4: Gate subclass picker by `subclassUnlockLevel` map; require selection for level-1-unlock classes

### Group 5 — Species Trait Application (step2)
- Display species traits with mechanical summaries (already done, display-only acceptable for now)

### Group 6 — Weapon Mastery (step3 or step5)
- BUG-6: Add `masteryProperty` to weapons; add mastery selection UI for eligible classes

### Group 7 — Equipment Options (step5)
- BUG-7: Add Option A class kits and Option B gold to step 5

### Group 8 — Innate Spell Level Gate (step4)
- BUG-10: Filter auto innate spells by `unlocksAtLevel <= draft.level`

### Group 9 — handleSave() Corrections (step6)
- Remove `racialBonuses` from final ability computation (BUG-1 back-end)
- Add `originFeat` to the saved character data

---

## APPENDIX — Data Integrity Notes

### Backgrounds and their correct 2024 Origin Feats
Based on the 2024 PHB, each background prescribes one origin feat:

| Background | Ability Bonuses | Origin Feat |
|------------|-----------------|-------------|
| Acolyte | WIS +2, INT +1 | Magic Initiate (Cleric) |
| Charlatan | CHA +2, DEX +1 | Skilled |
| Criminal | DEX +2, INT +1 | Alert |
| Entertainer | CHA +2, DEX +1 | Musician (or Performer variant) |
| Folk Hero | WIS +2, CON +1 | Tough |
| Guild Artisan | CHA +2, INT +1 | Skilled |
| Hermit | WIS +2, CON +1 | Magic Initiate (Druid or Cleric) |
| Noble | CHA +2, INT +1 | Skilled |
| Outlander | STR +2, WIS +1 | Tough |
| Sage | INT +2, WIS +1 | Magic Initiate (Wizard) |
| Sailor | STR +2, DEX +1 | Tavern Brawler |
| Soldier | STR +2, CON +1 | Savage Attacker |
| Urchin | DEX +2, INT +1 | Lucky |

> Note: Some 2024 backgrounds have slightly different prescribed feats from the exact table above. Verify against the 2024 PHB background entries before implementation. The ability bonuses listed above match the current `backgrounds.ts` values ✓.

### Subclass Unlock Levels (for DEV-C1 fix)
```typescript
const SUBCLASS_UNLOCK_LEVEL: Record<ClassKey, number> = {
  barbarian: 3,
  bard: 3,
  cleric: 1,
  druid: 2,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
  sorcerer: 1,
  warlock: 1,
  wizard: 3,
  artificer: 3,
}
```

### Weapon Mastery Properties (for Group 6)
2024 PHB properties (to add to `WeaponProperty` type and each weapon):
- **Cleave**: greataxe, halberd — on hit, deal half damage to a second creature
- **Graze**: glaive, greatsword — on miss, deal STR/DEX mod damage
- **Nick**: dagger, handaxe, light hammer, sickle — Light weapons make bonus offhand attack without using bonus action
- **Push**: greatclub, heavy crossbow, pike, warhammer — push target 10 ft on hit
- **Sap**: flail, mace, morningstar, war pick — target has disadvantage on next attack after hit
- **Slow**: club, javelin, light crossbow, longbow, quarterstaff, shortbow, spear, whip — reduce target speed by 10 ft
- **Topple**: battleaxe, lance, maul, trident — target makes CON save or is prone
- **Vex**: blowgun, dart, hand crossbow, longsword, rapier, scimitar, shortsword, sling — gain advantage on next attack against target
