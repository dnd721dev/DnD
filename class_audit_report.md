# Class Audit Report
Generated: 2026-04-24 — all 37 source files read before this was written.  
**No code has been changed.** Awaiting approval before any fixes.

---

## Critical System-Wide Bug

### Subclass field name mismatch — ALL subclass effects are dead

`applySubclassToDerived()` (`src/lib/applySubclassEffects.ts` line 54) reads:
```ts
const subclass = (c.subclass_key ?? null) as SubclassKey | null
if (!subclass) return d   // ← always fires
```

`CharacterSheetData` (`src/components/character-sheet/types.ts` line 32) defines:
```ts
subclass?: string | null   // ← field is "subclass", not "subclass_key"
```

`calc.ts` calls `applySubclassToDerived(c as any, ...)` where `c` is a `CharacterSheetData`.
Because `c.subclass_key` is always `undefined`, the function early-returns immediately
**on every character, every render.** Consequences:

- Draconic Sorcerer unarmored AC (13 + DEX) — **never applied**
- Champion Fighter Improved Critical (crit on 19) — **never applied**
- Every other subclass AC bonus, HP bonus, crit range, flag, and resource — **never applied**

**Fix:** Change line 54 from `c.subclass_key` to `c.subclass`.

---

## Findings by Class

| # | Class | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|-------|---------|-----------|-----------------|-----------------|--------|
| 1 | **All** | Subclass effects | varies | `applySubclassToDerived` reads `c.subclass_key`; field is `c.subclass`; function always early-returns | Read `c.subclass` so all subclass effects apply | **WRONG** |
| 2 | **All** | Proficiency bonus | — | `proficiencyForLevel`: +2/3/4/5/6 at levels 1-4/5-8/9-12/13-16/17-20 | Same — correct per 5e RAW | **CORRECT** |
| 3 | **All** | Ability modifiers | — | `abilityMod`: `Math.floor((score - 10) / 2)` | Same | **CORRECT** |
| 4 | **All** | Spell slots (full casters) | varies | `spellcastingProgression.ts` full-caster table verified against SRD | Same | **CORRECT** |
| 5 | **All** | Spell slots (half casters) | varies | Half-caster table verified against SRD | Same | **CORRECT** |

---

### Barbarian

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 6 | Hit Die | 1 | `CLASS_HIT_DIE['barbarian'] = 'd12'` | d12 | **CORRECT** |
| 7 | HP calc hit die | 1 | `hitDieForClass` returns 12 | 12 | **CORRECT** |
| 8 | Unarmored Defense AC | 1 | `computeArmorClass`: unarmored = `10 + dexMod` | `10 + dexMod + conMod` | **WRONG** |
| 9 | Rage uses | 1 | 2/3/4/5/6/∞ at levels 1/3/6/12/17/20 | 2/3/4/5/6/∞ at levels 1/3/6/12/17/20 | **CORRECT** |
| 10 | Rage recharge | 1 | `long_rest` | Long rest | **CORRECT** |
| 11 | Extra Attack | 5 | Feature text present; not wired to attack count | Feature text present | **CORRECT** |
| 12 | Fast Movement | 5 | Feature text present | Feature text present | **CORRECT** |
| 13 | Feral Instinct | 7 | Feature text present | Feature text present | **CORRECT** |
| 14 | Brutal Critical | 9 | Feature text present | Feature text present | **CORRECT** |
| 15 | Relentless Rage | 11 | Feature text present | Feature text present | **CORRECT** |
| 16 | Persistent Rage | 15 | Feature text present | Feature text present | **CORRECT** |
| 17 | Indomitable Might | 18 | Feature text present | Feature text present | **CORRECT** |
| 18 | Primal Champion | 20 | Feature text present | Feature text present | **CORRECT** |

---

### Bard

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 19 | Hit Die display | 1 | `CLASS_HIT_DIE['bard'] = 'd6'`; resource label "Hit Dice (d6)" | d8 | **WRONG** |
| 20 | HP calc hit die | 1 | `hitDieForClass` default path returns 8 | 8 | **CORRECT** |
| 21 | Bardic Inspiration uses | 1 | `profBonusForLevel(lvl)` = 2/3/4/5/6 | Proficiency bonus per long rest ✓ | **CORRECT** |
| 22 | Bardic Inspiration die | 1 | d6→d8→d10→d12 at levels 1/5/10/15 | Same | **CORRECT** |
| 23 | Font of Inspiration (short rest recharge) | 5 | `rechargeAtLevel: lvl >= 5 ? 'short_rest' : 'long_rest'` | Short rest from level 5 | **CORRECT** |
| 24 | Weapon proficiency | 1 | `proficiency-rules.ts` Bard = `simpleOnly` | Simple weapons + hand crossbow, longsword, rapier, shortsword | **WRONG** |
| 25 | Jack of All Trades | 2 | Feature text present | Feature text present | **CORRECT** |
| 26 | Song of Rest | 2 | Feature text present | Feature text present | **CORRECT** |
| 27 | Expertise | 3 | Feature text present | Feature text present | **CORRECT** |
| 28 | Bard College | 3 | Feature text present | Feature text present | **CORRECT** |
| 29 | Countercharm | 6 | Feature text present | Feature text present | **CORRECT** |
| 30 | Magical Secrets | 10 | Feature text present | Feature text present | **CORRECT** |
| 31 | Superior Inspiration | 20 | Feature text present | Feature text present | **CORRECT** |

---

### Cleric

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 32 | Hit Die | 1 | `CLASS_HIT_DIE['cleric'] = 'd8'` | d8 | **CORRECT** |
| 33 | Channel Divinity uses | 2 | 1/2/3 at levels 2/6/18, `short_rest` | 1 at lvl 2, 2 at lvl 6, 3 at lvl 18 | **CORRECT** |
| 34 | Turn Undead | 2 | Feature text present | Feature text present | **CORRECT** |
| 35 | Destroy Undead | 5 | Feature text present | Feature text present | **CORRECT** |
| 36 | Divine Intervention | 10 | Feature text present | Feature text present | **CORRECT** |

---

### Druid

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 37 | Hit Die | 1 | `CLASS_HIT_DIE['druid'] = 'd8'` | d8 | **CORRECT** |
| 38 | Wild Shape uses | 2 | 2 uses, `short_rest` (available from level 2) | 2 uses, short rest | **CORRECT** |
| 39 | Timeless Body | 18 | Feature text present | Feature text present | **CORRECT** |
| 40 | Beast Spells | 18 | Feature text present | Feature text present | **CORRECT** |
| 41 | Archdruid | 20 | Feature text present | Feature text present | **CORRECT** |

---

### Fighter

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 42 | Hit Die | 1 | `CLASS_HIT_DIE['fighter'] = 'd10'` | d10 | **CORRECT** |
| 43 | Second Wind uses | 1 | `maxAtLevel: profBonusForLevel(lvl)` = **2/3/4/5/6** at levels 1-4/5-8/9-12/13-16/17-20 | **1** use per short rest (2014 PHB) | **WRONG** |
| 44 | Second Wind recharge | 1 | `short_rest` | Short rest | **CORRECT** |
| 45 | Action Surge uses | 2 | 0→1→2 at levels 1/2/17, `short_rest` | 1 use at levels 2-16, 2 uses at level 17 | **CORRECT** |
| 46 | Indomitable uses | 9 | 0→1→2→3 at levels 8/9/13/17, `long_rest` | 1/2/3 uses at levels 9/13/17 | **CORRECT** |
| 47 | Extra Attack | 5 | Feature text present | Feature text present | **CORRECT** |

---

### Monk

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 48 | Hit Die | 1 | `CLASS_HIT_DIE['monk'] = 'd8'` | d8 | **CORRECT** |
| 49 | Unarmored Defense AC | 1 | `computeArmorClass`: unarmored = `10 + dexMod` | `10 + dexMod + wisMod` | **WRONG** |
| 50 | Martial Arts — damage die | 1 | `computeMainAttack` unarmed: `damageFormula = '1+strMod'` always | d4+DEX/STR (lvl 1-4), d6 (lvl 5-10), d8 (lvl 11-16), d10 (lvl 17+) | **WRONG** |
| 51 | Martial Arts — use DEX | 1 | Unarmed always uses STR | Monk may use DEX for unarmed attacks (use higher of STR/DEX) | **WRONG** |
| 52 | Ki points | 2 | 0 at level 1, then `level` points from level 2+, `short_rest` | Same | **CORRECT** |
| 53 | Ki — Flurry of Blows | 2 | Action costs 1 Ki ✓ | 1 Ki bonus action | **CORRECT** |
| 54 | Ki — Patient Defense | 2 | Action costs 1 Ki ✓ | 1 Ki bonus action | **CORRECT** |
| 55 | Ki — Step of the Wind | 2 | Action costs 1 Ki ✓ | 1 Ki bonus action | **CORRECT** |
| 56 | Deflect Missiles | 3 | Feature text present at level 3 | Level 3 | **CORRECT** |
| 57 | Slow Fall | 4 | Feature text present at level 4 | Level 4 | **CORRECT** |
| 58 | Extra Attack | 5 | Feature text present | Level 5 | **CORRECT** |
| 59 | Stunning Strike | 5 | Feature text present | Level 5 | **CORRECT** |
| 60 | Ki-Empowered Strikes | 6 | Feature text present | Level 6 | **CORRECT** |
| 61 | Evasion | 7 | Feature text present | Level 7 | **CORRECT** |
| 62 | Stillness of Mind | 7 | Feature text present | Level 7 | **CORRECT** |
| 63 | Purity of Body | 10 | Feature text present | Level 10 | **CORRECT** |
| 64 | Tongue of Sun & Moon | 13 | Feature text at level 13 | Level 13 ✓ | **CORRECT** |
| 65 | Diamond Soul | **13** | Feature at level **13** in `features.ts` | Level **14** per 5e RAW | **WRONG** |
| 66 | Timeless Body | 15 | Feature text at level 15 | Level 15 ✓ | **CORRECT** |
| 67 | Empty Body | 18 | Feature text at level 18 | Level 18 ✓ | **CORRECT** |
| 68 | Perfect Self | 20 | Feature text at level 20 | Level 20 ✓ | **CORRECT** |

---

### Paladin

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 69 | Hit Die | 1 | `CLASS_HIT_DIE['paladin'] = 'd10'` | d10 | **CORRECT** |
| 70 | Divine Sense uses | 1 | `profBonusForLevel(lvl)` per long rest | 1 + CHA modifier per long rest (not prof bonus) | **WRONG** |
| 71 | Lay on Hands pool | 1 | `level × 5` per long rest | `level × 5` per long rest | **CORRECT** |
| 72 | Spellcasting | 2 | Half-caster spell slot table ✓ | Half-caster | **CORRECT** |
| 73 | Divine Smite | 2 | Feature text present; action uses no slot at time (Reaction in 2024) | Feature text present | **CORRECT** |
| 74 | Divine Health | 3 | Feature text present | Level 3 | **CORRECT** |
| 75 | Sacred Oath | 3 | Feature text present | Level 3 | **CORRECT** |
| 76 | Channel Divinity | 3 | 2 uses, `short_rest`, available at level 3+ | 2 uses per short rest | **CORRECT** |
| 77 | Extra Attack | 5 | Feature text present | Level 5 | **CORRECT** |
| 78 | Aura of Protection | 6 | Feature text present | Level 6 | **CORRECT** |
| 79 | Aura of Courage | 7 | Feature text present | Level 7 | **CORRECT** |
| 80 | Improved Divine Smite | 11 | Feature text present | Level 11 | **CORRECT** |
| 81 | Cleansing Touch | 14 | Feature text present | Level 14 | **CORRECT** |

---

### Ranger

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 82 | Hit Die | 1 | `CLASS_HIT_DIE['ranger'] = 'd8'` | d8 | **CORRECT** |
| 83 | Spellcasting | 2 | Half-caster spell slot table ✓ | Half-caster | **CORRECT** |
| 84 | Extra Attack | 5 | Feature text present | Level 5 | **CORRECT** |
| 85 | Land's Stride | 8 | Feature text present | Level 8 | **CORRECT** |
| 86 | Hide in Plain Sight | 10 | Feature text present | Level 10 | **CORRECT** |
| 87 | Vanish | 14 | Feature text present | Level 14 | **CORRECT** |
| 88 | Feral Senses | 18 | Feature text present | Level 18 | **CORRECT** |
| 89 | Foe Slayer | 20 | Feature text present | Level 20 | **CORRECT** |

---

### Rogue

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 90 | Hit Die display | 1 | `CLASS_HIT_DIE['rogue'] = 'd10'`; resource label "Hit Dice (d10)" | d8 | **WRONG** |
| 91 | HP calc hit die | 1 | `hitDieForClass` default path returns 8 | 8 | **CORRECT** |
| 92 | Sneak Attack damage scaling | 1 | Action exists in registry; `setFlag` only; **no damage formula computed** | 1d6 at lvl 1, +1d6 per 2 levels (max 10d6 at lvl 19) | **MISSING** |
| 93 | Cunning Action | 2 | Action present, no cost | Level 2, no resource cost ✓ | **CORRECT** |
| 94 | Roguish Archetype | 3 | Feature text present | Level 3 | **CORRECT** |
| 95 | Uncanny Dodge | 5 | Feature text present | Level 5 | **CORRECT** |
| 96 | Evasion | 7 | Feature text present | Level 7 | **CORRECT** |
| 97 | Reliable Talent | 11 | Feature text present | Level 11 | **CORRECT** |
| 98 | Blindsense | 14 | Feature text present | Level 14 | **CORRECT** |
| 99 | Slippery Mind | 15 | Feature text present | Level 15 | **CORRECT** |
| 100 | Elusive | 18 | Feature text present | Level 18 | **CORRECT** |
| 101 | Stroke of Luck | 20 | Feature text present | Level 20 | **CORRECT** |

---

### Sorcerer

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 102 | Hit Die | 1 | `CLASS_HIT_DIE['sorcerer'] = 'd6'` | d6 | **CORRECT** |
| 103 | Sorcery Points | 2 | `level` points from level 2+, `long_rest` | Same | **CORRECT** |
| 104 | Draconic Resilience unarmored AC | 1 | Flag `sorcerer.draconic.unarmored_ac_13_plus_dex` exists in `applySubclassEffects.ts` **but never fires** (subclass field name bug — row #1) | 13 + DEX modifier when unarmored | **WRONG** (root cause: row #1) |
| 105 | Spell slots | 1 | Full caster table ✓ | Full caster | **CORRECT** |
| 106 | Metamagic | 3 | Feature text present | Level 3 | **CORRECT** |
| 107 | Sorcerous Restoration | 20 | Feature text present | Level 20 | **CORRECT** |

---

### Warlock

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 108 | Hit Die display | 1 | `CLASS_HIT_DIE['warlock'] = 'd6'`; resource label "Hit Dice (d6)" | d8 | **WRONG** |
| 109 | HP calc hit die | 1 | `hitDieForClass` default path returns 8 | 8 | **CORRECT** |
| 110 | Pact Magic slot count | 1 | 1→2→3 at levels 1/2/11 | 1→2 at levels 1/2, 3 at level 11 ✓ | **CORRECT** |
| 111 | Pact Magic recharge | 1 | `short_rest` | Short rest ✓ | **CORRECT** |
| 112 | Eldritch Invocations | 2 | Feature text present | Level 2 | **CORRECT** |
| 113 | Pact Boon | 3 | Feature text present | Level 3 | **CORRECT** |
| 114 | Mystic Arcanum | 11 | Feature text present | Level 11 | **CORRECT** |
| 115 | Eldritch Master | 20 | Feature text present | Level 20 | **CORRECT** |

---

### Wizard

| # | Feature | Gain Level | Current Behavior | Correct Behavior | Status |
|---|---------|-----------|-----------------|-----------------|--------|
| 116 | Hit Die | 1 | `CLASS_HIT_DIE['wizard'] = 'd6'` | d6 | **CORRECT** |
| 117 | Arcane Recovery | 1 | 1 use, `long_rest` | 1 use per long rest ✓ | **CORRECT** |
| 118 | Arcane Tradition | 2 | Feature text present | Level 2 | **CORRECT** |
| 119 | Spell slots | 1 | Full caster table ✓ | Full caster | **CORRECT** |
| 120 | Spell Mastery | 18 | Feature text present | Level 18 | **CORRECT** |
| 121 | Signature Spells | 20 | Feature text present | Level 20 | **CORRECT** |

---

## Bug Summary (WRONG / MISSING only)

| Priority | # | File | Bug | Fix |
|----------|---|------|-----|-----|
| P0 | 1 | `applySubclassEffects.ts:54` | `c.subclass_key` should be `c.subclass` — ALL subclass effects broken | Change to `c.subclass_key ?? c.subclass ?? null` or fix the type |
| P0 | 2 | `equipment-calc.ts:56` | Barbarian Unarmored Defense = `10+DEX` (missing CON) | `if classKey === 'barbarian': base = 10 + dexMod + conMod` |
| P0 | 3 | `equipment-calc.ts:56` | Monk Unarmored Defense = `10+DEX` (missing WIS) | `if classKey === 'monk': base = 10 + dexMod + wisMod` |
| P1 | 4 | `equipment-calc.ts:97–109` | Monk unarmed damage = `'1+strMod'` always | Scale die: d4/d6/d8/d10 at levels 1-4/5-10/11-16/17-20; use higher of STR/DEX |
| P1 | 5 | `classResources.ts:118` | Fighter Second Wind: `profBonusForLevel(lvl)` uses (2–6) | 1 use (2014 PHB); fix to return `1` |
| P1 | 6 | `features.ts:1059` | Monk Diamond Soul at level 13 | Should be level 14 |
| P2 | 7 | `classResources.ts:34` | `CLASS_HIT_DIE['rogue'] = 'd10'` | `'d8'` |
| P2 | 8 | `classResources.ts:42` | `CLASS_HIT_DIE['warlock'] = 'd6'` | `'d8'` |
| P2 | 9 | `classResources.ts:66` | Bard hit die resource die = `'d6'`, label = "Hit Dice (d6)" | `'d8'` / "Hit Dice (d8)" |
| P2 | 10 | `classResources.ts:186` | Rogue hit die resource die = stored as inherited `'d8'` but `CLASS_HIT_DIE` shows d10 | Align `CLASS_HIT_DIE['rogue']` to `'d8'` (see row 7) |
| P2 | 11 | `proficiency-rules.ts` | Bard `simpleOnly` — missing hand crossbow, longsword, rapier, shortsword | Add these 4 weapons to Bard's proficiency list |
| P2 | 12 | `classResources.ts:163` | Paladin Divine Sense uses `profBonusForLevel` | Should be `1 + CHA modifier` (runtime, not just level); stub at 2 or derive from abilities |
| P3 | 13 | Sneak Attack damage | Rogue Sneak Attack damage die not computed anywhere | Add `sneakAttackDice(level)` → `Math.ceil(level/2)d6` to `deriveStats` output |

**Notes on HP calculation:** Despite bugs in `CLASS_HIT_DIE` (rows 7–9), the actual max HP calculation in `hitPoints.ts`→`hitDieForClass` is correct for all classes (uses d8 default for bard/rogue/warlock). HP values in the database are correct; this is a display/resource-panel bug only.

**Note on Draconic Sorcerer (row 104):** The code for 13+DEX AC exists and is correct — it's simply unreachable until the subclass field name (row 1) is fixed first. No separate AC fix needed for Draconic.

---

**Awaiting approval before any changes.**
