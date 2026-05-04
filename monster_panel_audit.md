# Monster Stat Panel Audit
_Files read: MonsterStatPanel.tsx (588 lines), useMonsterPanel.ts (73 lines),
useEncounter.ts (63 lines), MonsterLibrary.tsx (432 lines), GMSidebar.tsx (440+ lines),
MapSection.tsx (197 lines), TableClientShell.tsx (9 lines),
TableClient.tsx (full, 1351 lines), DMPanel.tsx (727 lines),
monsters.ts, globals.css (skipped — no z-index context needed after confirming overlay mechanism)_

---

## SECTION 1 — Where is MonsterStatPanel currently rendered?

`TableClient.tsx` lines 1188–1210, inside the GM-only branch of the return:

```tsx
<div className="relative flex-1 min-h-0 min-w-0">
  {/* Monster Stat Panel — floats as overlay */}
  {openMonsterToken && (
    <MonsterStatPanel
      token={openMonsterToken}
      monster={openMonsterData}
      conditions={actorConditions[`token:${String(openMonsterToken.id)}`] ?? []}
      onToggleCondition={(condition) => {
        const key = `token:${String(openMonsterToken.id)}`
        setActorConditions((prev) => { ... })
      }}
      onClose={() => {
        setOpenMonsterToken(null)
        setOpenMonsterData(null)
      }}
      onRoll={handleExternalRoll}
    />
  )}

  {/* map + GM control bar live in the absolute-positioned sibling below */}
  <div className="absolute inset-0 flex flex-col overflow-hidden">
    ...
  </div>
  ...
</div>
```

The "floating" effect comes from the DOM order: `MonsterStatPanel` renders before the
`absolute inset-0` sibling that contains the map. Because it is a statically-positioned
child of a `relative` container, it pushes down in normal document flow — it sits above
the map's absolute layer visually but is not `position:fixed` or `position:absolute` itself.
`MonsterStatPanel`'s own outer div has no `position`, no `z-index`, and no `top/left`
attributes — it is a plain block element inside that relative parent.

---

## SECTION 2 — How does MonsterStatPanel receive its data?

### 2a. Token data (`token` prop)
`useMonsterPanel` hook (TableClient line 119) listens for the `dnd721-open-monster`
window event. When fired, `event.detail.token` is stored as `openMonsterToken`. This is
the raw token row from Supabase (has `.id`, `.label`, `.monster_id`, `.hp`, `.ac`, `.type`).

### 2b. Monster data (`monster` prop)
`useMonsterPanel` runs a second `useEffect` keyed on `openMonsterToken`. When the token
has a `monster_id`:
- `srd:<key>` → searches `MONSTERS` (SRD array from `@/lib/monsters`)
- `db:<id>` → fetches from `supabase.from('monsters').select('*').eq('id', dbId)`
- Anything else → `null`

### 2c. Conditions (`conditions` prop)
`actorConditions` state lives in TableClient. The key is `token:<tokenId>`. The toggle
callback mutates this map and re-renders.

### 2d. `onRoll` prop
`handleExternalRoll` from TableClient — persists to `session_rolls`, pushes to dice log,
flashes roll overlay.

---

## SECTION 3 — What triggers `dnd721-open-monster`?

Dispatched from **MapBoard.tsx** when the GM clicks a monster token on the map.
The same click also dispatches `dnd721-target-selected` (which `DMPanel` already listens
to, switching its internal tab to `'combat'`).

Both events fire for the same click, meaning when the GM clicks a monster token:
1. `DMPanel` switches to Combat tab and shows HP/conditions for that token.
2. `useMonsterPanel` in TableClient opens the floating stat block overlay.

The two panels are completely separate and currently show redundant/parallel information.

---

## SECTION 4 — DMPanel's current Combat tab

`DMPanel` already has an internal `dmTab` (`'tools' | 'combat'`). The Combat tab renders:

1. "Click any token on the map" placeholder when `!selectedToken`
2. **Target header** — token label, Clear button
3. **HP / AC stats** — current_hp, max hp, ac
4. **Quick HP buttons** — ±1 ±5 ±10 delta buttons + custom input
5. **Conditions** — 12-condition toggle grid + active-conditions badge row

`DMPanel` is rendered by `GMSidebar` in its **Tools tab** (2-col grid, left column).
`GMSidebar`'s Combat tab holds `InitiativeTracker` (left) + `MonsterLibrary` (right).

`DMPanel` already imports `supabase` and accepts `onRoll: (roll) => void` as a prop.
It does NOT currently import or render `MonsterStatPanel`.

---

## SECTION 5 — MonsterStatPanel component self-description

Props:
```ts
type MonsterStatPanelProps = {
  token:             any             // raw token row
  monster:           any | null      // loaded monster data (SRD or DB)
  conditions:        string[]        // active conditions for this token
  onToggleCondition: (c: string) => void
  onClose:           () => void
  onRoll:            (roll: ExternalRoll) => void
}
```

Outer div: `className="mt-2 space-y-3 rounded-lg border border-slate-700 bg-slate-900/90 p-3 text-xs text-slate-200 shadow-xl"` — no position, no z-index. It is a normal block element that can slot inline anywhere.

Internal state:
- `target` — populated by ANOTHER `dnd721-target-selected` listener inside MonsterStatPanel itself (for attack targeting)
- `lastAttackHitRef` — tracks last attack roll result for damage rolls

It renders a full stat block: CR/AC/HP/Speed summary, condition toggles, ability scores (clickable for checks), saves/skills/senses/languages/resistances/immunities, traits, actions with Roll Attack + Roll Damage buttons.

---

## SECTION 6 — Condition system: TableClient vs DMPanel

**TableClient path (current floating overlay):**
- `actorConditions: Record<string, string[]>` state in TableClient
- `onToggleCondition` mutates this state, keyed by `token:<id>`
- Feeds into MonsterStatPanel `conditions` prop
- Does NOT dispatch `dnd721-conditions-toggle` — MapBoard conditions rings may not update

**DMPanel path (existing Combat tab conditions):**
- `targetConditions: string[]` local state in DMPanel
- `toggleTargetCondition(cond)` mutates array and dispatches `dnd721-conditions-toggle` with `{ tokenId, conditions: next }` — MapBoard condition rings DO update

**These are two separate condition systems for the same token.** The floating overlay's
conditions (`actorConditions`) are NOT wired to MapBoard condition rings. The inline
DMPanel conditions ARE wired to MapBoard.

---

## SECTION 7 — Identified changes for the move

| # | File | Change | Reason |
|---|------|--------|--------|
| 1 | `TableClient.tsx` | Remove floating `MonsterStatPanel` JSX (lines 1188–1210) | Move inline |
| 2 | `TableClient.tsx` | Remove `useMonsterPanel` import + hook call | No longer needed at top level |
| 3 | `TableClient.tsx` | Remove `MonsterStatPanel` import | No longer rendered here |
| 4 | `DMPanel.tsx` | Add `monsterData: any \| null` state | Holds loaded monster |
| 5 | `DMPanel.tsx` | Add useEffect to load monster when `selectedToken.type === 'monster'` | Replaces useMonsterPanel |
| 6 | `DMPanel.tsx` | Import `MonsterStatPanel` + `MONSTERS` | For rendering + SRD lookup |
| 7 | `DMPanel.tsx` | Render `<MonsterStatPanel>` at bottom of Combat tab | Inline stat block |
| 8 | `DMPanel.tsx` | Wire `conditions={targetConditions}` and `onToggleCondition={toggleTargetCondition}` | Use DMPanel's existing condition system (fixes the MapBoard ring sync bug as a free bonus) |
| 9 | `useMonsterPanel.ts` | Delete file | Dead code after changes |

---

## SECTION 8 — Edge cases and risks

| Case | Risk | Mitigation |
|------|------|------------|
| PC token selected | `selectedToken.type !== 'monster'` → no stat block loaded | Guard: `if (selectedToken?.type !== 'monster') { setMonsterData(null); return }` |
| Token has no `monster_id` | Supabase-free token with `type: 'monster'` | Same guard: `if (!selectedToken?.monster_id) { setMonsterData(null); return }` |
| `monster_id` neither `srd:` nor `db:` | Returns null; stat block hidden | `setMonsterData(null)` fallback already in useMonsterPanel |
| Panel too tall for small screens | MonsterStatPanel is 588-line component; Combat tab scrolls | `overflow-y-auto` already on Combat tab div (line 273 of DMPanel) |
| `onRoll` in inline panel | Needs `handleExternalRoll` from TableClient | Already threaded: TableClient → GMSidebar (`onRoll`) → DMPanel (`onRoll`) ✓ |
| Clearing selected token | `setSelectedToken(null)` + `setTargetConditions([])` | Also add `setMonsterData(null)` in the Clear button handler |
| Monster stat block's own `dnd721-target-selected` listener | MonsterStatPanel has internal `target` state; this still works inline | No change needed; it's just a listener on window |

---

## Summary

The floating overlay pattern in TableClient is architecturally awkward: it sits in the
map content area, uses a parallel condition system disconnected from MapBoard rings, and
forces the GM to manage two separate panels (DMPanel Combat tab for HP + MonsterStatPanel
for stat block) that logically belong together.

The fix is a single coherent change: move the stat block loading from `useMonsterPanel`
into `DMPanel` itself (triggered by `selectedToken` changes rather than a separate window
event), and render `<MonsterStatPanel>` inline at the bottom of `DMPanel`'s Combat tab.
This collapses two separate workflows into one, reuses DMPanel's existing condition
system (which correctly syncs to MapBoard), and removes the overlay.

`useMonsterPanel.ts` becomes dead code and can be deleted.
