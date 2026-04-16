# DND721 Cleanup Report
Generated: 2026-04-15

Awaiting approval before any files are deleted or modified.

---

## 0A — Duplicate component tree: `src/lib/components/` → DELETE ALL 52 files

`src/lib/components/` is a shadow copy of `src/components/`. No file in `src/app/` or `src/components/` imports from `@/lib/components`. The lib copies import *from* `@/components`, confirming they are the stale originals.

**Files to delete:**

| File | Reason |
|------|--------|
| `src/lib/components/supabaseClient.ts` | Duplicate of `src/components/supabaseClient.ts` |
| `src/lib/components/auth/WalletJwtGate.tsx` | Duplicate of `src/components/auth/WalletJwtGate.tsx` |
| `src/lib/components/character-sheet/AbilitiesPanel.tsx` | Re-exports from `@/components/character-sheet/AbilitiesPanel` — pure proxy |
| `src/lib/components/character-sheet/ActionsPanel.tsx` | Duplicate of `src/components/character-sheet/ActionsPanel.tsx` |
| `src/lib/components/character-sheet/calc.ts` | Duplicate of `src/components/character-sheet/calc.ts` |
| `src/lib/components/character-sheet/CharacterHeader.tsx` | Duplicate of `src/components/character-sheet/CharacterHeader.tsx` |
| `src/lib/components/character-sheet/CombatStatsPanel.tsx` | Duplicate of `src/components/character-sheet/CombatStatsPanel.tsx` |
| `src/lib/components/character-sheet/equipment-calc.ts` | Duplicate of `src/components/character-sheet/equipment-calc.ts` |
| `src/lib/components/character-sheet/equipment-db.ts` | Duplicate of `src/components/character-sheet/equipment-db.ts` |
| `src/lib/components/character-sheet/EquipmentPanel.tsx` | Duplicate of `src/components/character-sheet/EquipmentPanel.tsx` |
| `src/lib/components/character-sheet/InventoryPanel.tsx` | Duplicate of `src/components/character-sheet/InventoryPanel.tsx` |
| `src/lib/components/character-sheet/PersonalityNotesPanel.tsx` | Duplicate of `src/components/character-sheet/PersonalityNotesPanel.tsx` |
| `src/lib/components/character-sheet/proficiency-rules.ts` | Duplicate of `src/components/character-sheet/proficiency-rules.ts` |
| `src/lib/components/character-sheet/ResourcesPanel.tsx` | Duplicate of `src/components/character-sheet/ResourcesPanel.tsx` |
| `src/lib/components/character-sheet/RollLogPanel.tsx` | Duplicate of `src/components/character-sheet/RollLogPanel.tsx` |
| `src/lib/components/character-sheet/SavingThrowsPanel.tsx` | Duplicate of `src/components/character-sheet/SavingThrowsPanel.tsx` |
| `src/lib/components/character-sheet/skills.ts` | Duplicate of `src/components/character-sheet/skills.ts` |
| `src/lib/components/character-sheet/SkillsPanel.tsx` | Duplicate of `src/components/character-sheet/SkillsPanel.tsx` |
| `src/lib/components/character-sheet/SpellsPanel.tsx` | Duplicate of `src/components/character-sheet/SpellsPanel.tsx` |
| `src/lib/components/character-sheet/TraitsFeaturesPanel.tsx` | Duplicate of `src/components/character-sheet/TraitsFeaturesPanel.tsx` |
| `src/lib/components/character-sheet/types.ts` | Duplicate of `src/components/character-sheet/types.ts` |
| `src/lib/components/character-sheet/utils.ts` | Duplicate of `src/components/character-sheet/utils.ts` |
| `src/lib/components/layout/header.tsx` | Duplicate of `src/components/layout/header.tsx` |
| `src/lib/components/profile/ProfileNavButton.tsx` | Duplicate of `src/components/profile/ProfileNavButton.tsx` |
| `src/lib/components/table/DMPanel.tsx` | Duplicate of `src/components/table/DMPanel.tsx` |
| `src/lib/components/table/FogOfWarOverlay.tsx` | Duplicate of `src/components/table/FogOfWarOverlay.tsx` |
| `src/lib/components/table/GMSidebar.tsx` | Duplicate of `src/components/table/GMSidebar.tsx` |
| `src/lib/components/table/InitiativeTracker.tsx` | Duplicate of `src/components/table/InitiativeTracker.tsx` |
| `src/lib/components/table/MapBoard.tsx` | Duplicate of `src/components/table/MapBoard.tsx` |
| `src/lib/components/table/MapBoardView.tsx` | Duplicate of `src/components/table/MapBoardView.tsx` |
| `src/lib/components/table/MonsterLibrary.tsx` | Duplicate of `src/components/table/MonsterLibrary.tsx` |
| `src/lib/components/table/MonsterStatPanel.tsx` | Duplicate of `src/components/table/MonsterStatPanel.tsx` |
| `src/lib/components/table/PlayerSidebar.tsx` | Duplicate of `src/components/table/PlayerSidebar.tsx` |
| `src/lib/components/table/TableHeader.tsx` | Duplicate of `src/components/table/TableHeader.tsx` |
| `src/lib/components/table/TokenHUD.tsx` | Duplicate of `src/components/table/TokenHUD.tsx` |
| `src/lib/components/table/useCampaignCharacter.ts` | Duplicate of `src/components/table/useCampaignCharacter.ts` |
| `src/lib/components/table/VoiceChat.tsx` | Duplicate of `src/components/table/VoiceChat.tsx` |
| `src/lib/components/table/tableclient/types.ts` | Duplicate of `src/components/table/tableclient/types.ts` |
| `src/lib/components/table/tableclient/utils.ts` | Duplicate of `src/components/table/tableclient/utils.ts` |
| `src/lib/components/table/tableclient/components/DiceLogOverlay.tsx` | Duplicate of `src/components/table/tableclient/components/DiceLogOverlay.tsx` |
| `src/lib/components/table/tableclient/components/DiceRollOverlay.tsx` | Duplicate of `src/components/table/tableclient/components/DiceRollOverlay.tsx` |
| `src/lib/components/table/tableclient/components/GMQuickRolls.tsx` | Duplicate (note: `src/components/` version was already deleted per git status) |
| `src/lib/components/table/tableclient/components/GMStartTurnsButton.tsx` | Duplicate — check if `src/components/` has this file; if not, migrate before deleting |
| `src/lib/components/table/tableclient/components/MapSection.tsx` | Duplicate of `src/components/table/tableclient/components/MapSection.tsx` |
| `src/lib/components/table/tableclient/components/TableTopBar.tsx` | Duplicate of `src/components/table/tableclient/components/TableTopBar.tsx` |
| `src/lib/components/table/tableclient/hooks/useEncounter.ts` | Duplicate of `src/components/table/tableclient/hooks/useEncounter.ts` |
| `src/lib/components/table/tableclient/hooks/useMonsterPanel.ts` | Duplicate of `src/components/table/tableclient/hooks/useMonsterPanel.ts` |
| `src/lib/components/table/tableclient/hooks/useSessionCharacters.ts` | Duplicate of `src/components/table/tableclient/hooks/useSessionCharacters.ts` |
| `src/lib/components/table/tableclient/hooks/useSessionRolls.ts` | Duplicate of `src/components/table/tableclient/hooks/useSessionRolls.ts` |
| `src/lib/components/table/tableclient/hooks/useSessionWithCampaign.ts` | Duplicate of `src/components/table/tableclient/hooks/useSessionWithCampaign.ts` |
| `src/lib/components/ui/Collapse.tsx` | Duplicate of `src/components/ui/Collapse.tsx` |
| `src/lib/components/wallet/ConnectButton.tsx` | Duplicate of `src/components/wallet/ConnectButton.tsx` |

> **Special case — `GMStartTurnsButton.tsx`**: This file exists in `src/lib/components/` but NOT in `src/components/`. Before deletion, it should be moved to `src/components/table/tableclient/components/GMStartTurnsButton.tsx` and any imports updated.

---

## 0A (continued) — Duplicate hooks: `src/lib/hooks/` → DELETE or MIGRATE

| File | Status | Action |
|------|--------|--------|
| `src/lib/hooks/useCurrentActor.ts` | Duplicate of `src/hooks/useCurrentActor.ts` | Delete |
| `src/lib/hooks/useMounted.ts` | **No equivalent in `src/hooks/`** — imported by `src/app/sessions/[id]/table/TableClient.tsx` | Move to `src/hooks/useMounted.ts`, update import in TableClient.tsx |
| `src/lib/hooks/useCharacterDraftSync.ts` | **No equivalent in `src/hooks/`** — imported by `src/app/characters/new/layout.tsx` | Move to `src/hooks/useCharacterDraftSync.ts`, update import in layout.tsx |

---

## 0B — Foundry VTT raw files: DELETE 7 files

These reference Foundry globals (`game`, `CONFIG`, `foundry.dice.terms`) and cannot run in Next.js. They are not imported anywhere in the codebase.

| File | Size | Reason |
|------|------|--------|
| `src/lib/diceSoNice/Dice3D.raw.js` | 41 KB | Foundry VTT globals — dead in Next.js |
| `src/lib/diceSoNice/DiceBox.raw.js` | 45 KB | Foundry VTT globals — dead in Next.js |
| `src/lib/diceSoNice/DiceFactory.raw.js` | 45 KB | Foundry VTT globals — dead in Next.js |
| `src/lib/diceSoNice/DiceModels.raw.js` | 508 KB | Foundry VTT globals — dead in Next.js |
| `src/lib/diceSoNice/DiceNotation.raw.js` | 8 KB | Foundry VTT globals — dead in Next.js |
| `src/lib/diceSoNice/DiceSystem.raw.js` | 20 KB | Foundry VTT globals — dead in Next.js |
| `src/lib/diceSoNice/PhysicsWorker.raw.js` | 21 KB | Foundry VTT globals — dead in Next.js |

**Keep:**
- `src/lib/diceSoNice/DiceBox.ts` — clean standalone, imported by DiceCanvas3D.tsx
- `src/lib/diceSoNice/DiceModels.ts` — clean standalone geometry data

---

## 0C — Broken import scan

No files in `src/app/` or `src/components/` import from `@/lib/components`. The only active broken-import risk is the two `@/lib/hooks` references flagged in 0A above:

| File | Import to fix |
|------|---------------|
| `src/app/sessions/[id]/table/TableClient.tsx` | `@/lib/hooks/useMounted` → `@/hooks/useMounted` |
| `src/app/characters/new/layout.tsx` | `@/lib/hooks/useCharacterDraftSync` → `@/hooks/useCharacterDraftSync` |

---

## 0D — Unused public assets: DELETE 5 files

No component or page imports any of these files. They are Next.js default scaffolding.

| File | Size |
|------|------|
| `public/file.svg` | 391 B |
| `public/globe.svg` | 1 KB |
| `public/next.svg` | 1.3 KB |
| `public/vercel.svg` | 128 B |
| `public/window.svg` | 385 B |

---

## Summary

| Category | Files to delete | Files to migrate first |
|----------|----------------|------------------------|
| 0A — Duplicate components | 50 | 1 (`GMStartTurnsButton.tsx`) |
| 0A — Duplicate hooks | 1 (`useCurrentActor.ts`) | 2 (`useMounted.ts`, `useCharacterDraftSync.ts`) |
| 0B — Foundry raw files | 7 | 0 |
| 0D — Default SVGs | 5 | 0 |
| **Total** | **63** | **3** |

Plus 2 import-path fixes in `TableClient.tsx` and `characters/new/layout.tsx` after migration.

---

**Awaiting your approval to proceed with deletions and migrations.**
