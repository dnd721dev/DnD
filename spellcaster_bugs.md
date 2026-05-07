# Spellcaster Creation Bug Report
_Generated from spellcaster_audit.md — all bugs confirmed from source code_

---

## BUG 1 — CRITICAL: `spellcasting_ability` column missing from all migrations → Spellbook tab never appears

**Class affected:** All spellcasters (Wizard, Sorcerer, Cleric, Druid, Bard, Paladin, Ranger, Warlock)

**Symptom:** After creating a spellcaster character and navigating to the character sheet, the "Spellbook" tab is completely absent. The player has no way to view or manage their spells. Additionally, if PostgREST rejects unknown columns on insert, the entire character creation save (step6) may fail with a 400 error for all spellcaster classes.

**Root cause:**
- `src/app/characters/new/step6/page.tsx` saves `spellcasting_ability: castingAbilityKey` in the character insert payload.
- `src/app/characters/[id]/page.tsx` line: `const isMageUser = Boolean(c.spellcasting_ability)` — gates the entire Spellbook tab.
- Neither `supabase/migrations/002_rebuild_backend.sql` nor `supabase/migrations/011_character_sheet_columns.sql` nor any other migration file contains a `spellcasting_ability` column on the `characters` table.
- Result: `c.spellcasting_ability` is always `undefined` → `isMageUser` is always `false` → Spellbook tab never rendered.

**Fix:** Add a migration:
```sql
ALTER TABLE characters ADD COLUMN IF NOT EXISTS spellcasting_ability TEXT;
```
Also update the TypeScript character type to include `spellcasting_ability?: string | null`.

**Priority:** CRITICAL

---

## BUG 2 — CRITICAL: Level 1 Paladin and Ranger cannot select any spells in step4

**Class affected:** Paladin, Ranger

**Symptom:** On step 4 (spell selection), a level 1 Paladin or level 1 Ranger sees a completely empty spell list. There are no spells available to pick. The UI shows no explanation — it silently displays nothing.

**Root cause:**
- `src/app/characters/new/step4/page.tsx` computes `maxSpellLevel` from `getSpellSlotsForClass(classKey, level)`.
- `src/lib/spellcastingProgression.ts`: `HALF_CASTER_SLOTS_BY_LEVEL[1] = {}` — returns an empty object for level 1 (follows 2014 rules where half-casters have no spell slots at level 1).
- `maxSpellLevel = Math.max(0, ...Object.keys(slots).map(Number))` → when `slots = {}`, `Object.keys` is empty, `Math.max(0)` returns `0`.
- Spell filter in step4: `s.level <= maxSpellLevel` → `s.level <= 0` → only cantrips (level 0) pass, and cantrips are not in the Paladin/Ranger spell list.
- Result: zero spells rendered for level 1 Paladin and Ranger.

**Fix:** Either:
1. Switch to 2024 rules: `HALF_CASTER_SLOTS_BY_LEVEL[1] = { 1: 2 }` (2 first-level slots at level 1), or
2. Apply a floor: when `maxSpellLevel === 0` and the class is a half-caster, treat `maxSpellLevel = 1` so at least 1st-level spells are shown, or
3. Show a message explaining "Paladins and Rangers do not gain spell slots until level 2" instead of a blank list (if 2014 rules are intentional).

**Priority:** CRITICAL

---

## BUG 3 — CRITICAL: No maximum cantrip or spell selection cap enforced in step4

**Class affected:** All spellcasters

**Symptom:** A player can select an unlimited number of cantrips and spells in step4. A Wizard can pick all 50+ wizard spells. A Sorcerer can pick 100 spells despite knowing only 2 at level 1. No error, no warning, no cap.

**Root cause:**
- `src/app/characters/new/step4/page.tsx`: `toggleKnown` and `togglePrepared` toggle spells in/out of their respective arrays with no size check.
- There are no per-class cantrips-known tables in `src/lib/spellcastingProgression.ts`.
- There are no spells-known tables for known-spell casters (Sorcerer, Bard, Ranger, Warlock) anywhere in the codebase.

**Fix:**
1. Add cantrips-known tables to `spellcastingProgression.ts` (e.g., `CANTRIPS_KNOWN_BY_CLASS_AND_LEVEL`).
2. Add spells-known tables for Sorcerer, Bard, Ranger, Warlock.
3. In `toggleKnown` / `togglePrepared`, check current count against limit and block if at cap.
4. Display current count vs. allowed in the UI (e.g., "Cantrips: 2 / 3", "Spells Known: 4 / 4").

**Priority:** CRITICAL

---

## BUG 4 — CRITICAL: No minimum spell selection enforced — Next always enabled in step4

**Class affected:** All spellcasters

**Symptom:** A Wizard can advance past step4 with zero spells selected. The character is saved with `spells_known: []` and `spells_prepared: []`. The Spellbook tab (once BUG 1 is fixed) shows empty lists with no explanation.

**Root cause:**
- `src/app/characters/new/step4/page.tsx`: `handleNext()` navigates to step5 unconditionally with no minimum validation.
- The Next button has no disabled state based on spell selection count.

**Fix:** Add a validation check in `handleNext()`:
- Require at least 1 cantrip selected for classes that get cantrips.
- Require at least 1 spell selected for known-spell casters (or note it's optional for prepared casters who may choose at the table).
- Disable or warn the Next button when minimum requirements are not met.

**Priority:** CRITICAL

---

## BUG 5 — HIGH: No spell count display or guidance in step4

**Class affected:** All spellcasters

**Symptom:** The player sees a flat list of spells with no indication of how many they should pick, how many they've already picked, or what the class rules are. There is no "Cantrips: 2/3" counter, no "Spells Known: 0/4" counter, no class rule explanation (e.g., "Wizards start with 6 spells in their spellbook").

**Root cause:**
- `src/app/characters/new/step4/page.tsx` renders no count indicators, no selection summary, and no class-specific guidance text.
- The spell selection limits do not exist in the codebase yet (see BUG 3), so there is nothing to display.

**Fix:** After implementing BUG 3's limit tables, add a header section in step4 showing:
- Cantrips: `{selectedCantrips.length} / {maxCantrips}` (with colour change when at cap)
- Spells: `{knownSpells.length} / {maxSpellsKnown}` for known-spell casters, or `{preparedSpells.length} prepared (max: {modifier + level})` for prepared casters.
- A short class-specific rule blurb (e.g., "Sorcerers know a fixed number of spells. Choose wisely.").

**Priority:** HIGH

---

## BUG 6 — HIGH: No prepared spell count formula or guidance for prepared casters in step4

**Class affected:** Cleric, Druid, Paladin, Wizard

**Symptom:** Prepared casters (Cleric, Druid, Paladin, Wizard) see the same undifferentiated spell list as known-spell casters. There is no indication that these classes prepare spells (not learn them), no formula shown for how many they may prepare (e.g., "Cleric: Wisdom modifier + Cleric level"), and no visual distinction between prepared and known selections.

**Root cause:**
- `src/app/characters/new/step4/page.tsx` has a `preparedSpells` array but renders it identically to `knownSpells` — the same toggle UI with no additional context.
- No formula is computed or displayed for `maxPrepared`.

**Fix:**
1. Compute `maxPrepared` per class: e.g., Cleric = WIS modifier + level, Druid = WIS modifier + level, Wizard = INT modifier + level, Paladin = CHA modifier + half level (rounded down, min 1).
2. Display "Prepared spells: {preparedSpells.length} / {maxPrepared}" prominently.
3. Add a note: "These are your prepared spells for the day. You can change them on a long rest."

**Priority:** HIGH

---

## BUG 7 — HIGH: Wizard spellbook mechanic not implemented

**Class affected:** Wizard

**Symptom:** Wizards in step4 see a standard "pick spells" UI identical to all other casters. There is no distinction between:
- Spellbook spells (spells the Wizard owns and can prepare from)
- Prepared spells (subset chosen each day from spellbook)
- Starting spellbook (6 spells at level 1, 2 free of chosen school)

Wizards are treated as a known-spell caster with no preparation mechanic, rather than as the preparation caster with a large spellbook they actually are.

**Root cause:**
- `src/app/characters/new/step4/page.tsx` has no Wizard-specific branch.
- `src/lib/spellcastingProgression.ts` has no spellbook-size table or wizard-specific logic.

**Fix:**
1. For Wizards, first select spellbook spells (6 at level 1, minimum 1st-level, filtered to Wizard list).
2. Then select prepared spells from those spellbook spells (INT modifier + Wizard level).
3. Save spellbook to `spells_known` (the full book) and prepared subset to `spells_prepared`.

**Priority:** HIGH

---

## BUG 8 — HIGH: Cleric domain spells and Druid circle spells not auto-added

**Class affected:** Cleric, Druid

**Symptom:** Clerics and Druids do not automatically receive their subclass (domain/circle) spell list. A Life Cleric should always have Cure Wounds, Bless, etc. available as bonus prepared spells. Currently, these are not added at all — the player must manually find and select them from the full Cleric list (or they go missing entirely).

**Root cause:**
- `src/app/characters/new/step4/page.tsx` has no subclass-aware spell injection.
- The step3 subclass selection is in localStorage draft (`draft.subclass`) but step4 does not read it to auto-add domain/circle spells.
- There is no domain-spells data map anywhere in the codebase.

**Fix:**
1. Add a `DOMAIN_SPELLS` map (or `CIRCLE_SPELLS` for Druid) keyed by subclass name → spell list per level.
2. In step4, read `draft.subclass`, look up the domain spell list, and automatically mark those spells as always-prepared (not removable by the player).
3. Display them separately as "Domain Spells (always prepared)" in the UI.

**Priority:** HIGH

---

## BUG 9 — MEDIUM: Cantrips and leveled spells mixed in the same list in step4

**Class affected:** All spellcasters

**Symptom:** The spell selection list in step4 shows cantrips (level 0) and leveled spells (levels 1–9) in a single flat list. The player must scroll through everything at once with no visual grouping. Cantrips and spells have different selection mechanics (cantrips are known permanently; leveled spells are known or prepared) but appear identical in the UI.

**Root cause:**
- `src/app/characters/new/step4/page.tsx` renders all filtered spells in one unsorted list. There is no grouping by spell level or type.

**Fix:**
1. Separate cantrips (`s.level === 0`) into a distinct "Cantrips" section rendered above leveled spells.
2. Group leveled spells by spell level (1st, 2nd, 3rd…) with collapsible or clearly-labelled sections.
3. Display separate counters for cantrips and leveled spells.

**Priority:** MEDIUM

---

## BUG 10 — MEDIUM: Ranger missing from `isPreparedCaster` in SpellsPanel

**Class affected:** Ranger

**Symptom:** On the character sheet Spellbook tab, a Ranger sees a "Prepared Spells" section with a toggle UI (showing prepared vs. known spells separately). However, per D&D 5e rules, Rangers are known-spell casters, not prepared-spell casters — they always have their spells "prepared" and do not swap them out on a rest. The UI incorrectly implies Rangers prepare spells.

**Root cause:**
- `src/components/character-sheet/SpellsPanel.tsx`: `isPreparedCaster` is hardcoded as:
  ```typescript
  const isPreparedCaster = ['cleric','druid','wizard','paladin'].includes(c.main_job ?? '')
  ```
  Ranger is not in this list, so `isPreparedCaster = false` for Rangers. However, the rendering logic may still show `spells_prepared` array contents if they exist, creating confusion.

**Fix:** This is actually correct behaviour — Rangers should NOT be in `isPreparedCaster`. However, if `spells_prepared` was accidentally populated for a Ranger during step6 (due to step6 treating Rangers as prepared casters), data may be inconsistent. Verify step6 logic for Rangers and ensure `spells_prepared` is never written for Ranger characters. Document in code comments that Ranger intentionally omitted.

**Priority:** MEDIUM

---

## BUG 11 — MEDIUM: Spells saved as plain text names only — no metadata on character

**Class affected:** All spellcasters

**Symptom:** The character record stores `spells_known TEXT[]` and `spells_prepared TEXT[]` as arrays of spell names (e.g., `["Fireball", "Magic Missile"]`). If a spell is renamed or removed from `SRD_SPELLS`, characters silently lose access to that spell with no error. There is no way to display spell details offline or without the SRD data file.

**Root cause:**
- `supabase/migrations/002_rebuild_backend.sql`: `spells_known TEXT[]`, `spells_prepared TEXT[]` — names only.
- `src/app/characters/new/step6/page.tsx` saves `spells_known: [...knownSpells, ...innateSpells, ...racialCantrip]` as string arrays.
- `src/components/character-sheet/SpellsPanel.tsx` resolves spell details at runtime via `SRD_SPELLS.find(s => s.name === spellName)` — no fallback if name not found.

**Fix (low-cost approach):** Store spell slugs or IDs instead of display names, and document the SRD spell list as immutable (names cannot change). Add a null-check in SpellsPanel when a spell name cannot be resolved, showing a "Unknown spell: [name]" fallback instead of silently skipping it.

**Fix (higher-cost approach):** Store spells as `JSONB[]` with `{name, level, school, castingTime, ...}` snapshot at time of character creation, so spell details survive SRD changes. This is a schema migration.

**Priority:** MEDIUM

---

## Priority Summary

| # | Priority | Class Affected | Issue |
|---|----------|----------------|-------|
| 1 | CRITICAL | All spellcasters | `spellcasting_ability` column missing → Spellbook tab never appears |
| 2 | CRITICAL | Paladin, Ranger | Level 1 cannot select any spells (maxSpellLevel = 0) |
| 3 | CRITICAL | All spellcasters | No maximum spell/cantrip selection cap |
| 4 | CRITICAL | All spellcasters | No minimum spell selection — Next always enabled |
| 5 | HIGH | All spellcasters | No spell count display or selection guidance in step4 |
| 6 | HIGH | Cleric, Druid, Paladin, Wizard | No prepared spell formula or guidance |
| 7 | HIGH | Wizard | Spellbook mechanic not implemented |
| 8 | HIGH | Cleric, Druid | Domain/circle spells not auto-added |
| 9 | MEDIUM | All spellcasters | Cantrips and leveled spells mixed in one flat list |
| 10 | MEDIUM | Ranger | Ranger in isPreparedCaster check needs verification |
| 11 | MEDIUM | All spellcasters | Spells stored as names only — no metadata or fallback |

## Recommended Fix Order

1. **BUG 1** — Add `spellcasting_ability` migration (1 SQL line — unblocks everything else)
2. **BUG 2** — Fix level 1 Paladin/Ranger spell access (1 line in spellcastingProgression.ts)
3. **BUG 3 + BUG 4** — Add cantrip/spell-known limits and minimum validation (new data tables + step4 logic)
4. **BUG 5 + BUG 6** — Add count display and prepared formula (step4 UI additions)
5. **BUG 9** — Split cantrips from leveled spells in step4 list (step4 render refactor)
6. **BUG 7** — Wizard spellbook mechanic (new step4 Wizard branch)
7. **BUG 8** — Domain/circle spells (new data map + step4 injection)
8. **BUG 10** — Verify Ranger isPreparedCaster and step6 data
9. **BUG 11** — Spell storage improvement (schema decision required)
