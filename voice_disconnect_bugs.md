# Voice Disconnect Bug Report
Written after full audit — no code has been changed yet.

---

## Bug 1 — 30-second idle redirect kicks players out of voice

**Priority: CRITICAL**

**Root cause:**
`src/app/sessions/[id]/table/TableClient.tsx`, lines 83–106

```typescript
const resetIdleTimer = useCallback(() => {
  idleTimerRef.current = setTimeout(() => {
    router.push(target)  // ← fires after 30 seconds
  }, 30_000)             // ← 30 SECONDS
}, [campaignId, router])
```

The idle timer arms on mount for every player (GMs are exempt). It fires
`router.push('/campaigns/...')` after 30 seconds of no `mousemove`, `mousedown`,
`keydown`, `touchstart`, `scroll`, or `click` events on the window.

**Why it causes repeated disconnects:**
A player sitting back and listening to the GM, watching tokens move on the map,
or just talking in voice chat without touching their keyboard or mouse will trigger
this timer every single time. It navigates them off the table page, which unmounts
`TableClient` → unmounts `TableTopBar` → unmounts `VoiceChat` → `room.disconnect()`
fires in the cleanup effect. They come back, reconnect, are quiet for 30 seconds
again, and are kicked again. This is an exact loop.

**Why 30 seconds is wrong:**
A tabletop RPG session has long stretches where a player is passive — listening to
descriptions, watching others take turns, watching the GM move enemies on the map.
30 seconds is shorter than most combat turns. A player can easily go 30+ seconds
without touching their input devices even in an active session.

**Fix:**
Option A (recommended): Increase the idle timeout to 20–30 minutes, or set it to only
  fire when the session status is 'lobby' or 'completed' (not 'active').
Option B: Remove the idle redirect entirely for players in an active session.
  (`sessionStatus === 'active'` → skip arming the timer)
Option C: Add Supabase realtime events (token moves, new chat messages, dice rolls)
  as reset triggers so map/chat activity counts as "interaction."

---

## Bug 2 — Room object not cleaned up after RoomEvent.Disconnected

**Priority: HIGH**

**Root cause:**
`src/components/table/VoiceChat.tsx`, lines 162–205 (`handleConnect`)

When `RoomEvent.Disconnected` fires, the handler calls:
```typescript
setConnected(false)
setIsReconnecting(false)
setParticipants([])
setLocalMuted(false)
// ← setRoom(null) is MISSING
```

`room` state stays as the disconnected Room object. The Room's event listeners
(`setConnected`, `setParticipants`, `setLocalMuted`, `setIsReconnecting`) remain
attached to this stale Room forever.

If the player clicks "Voice" again, `handleConnect` creates a **new** Room object,
attaches a second set of event handlers, and calls `setRoom(newRoom)`. Now two Room
objects exist: the old disconnected one (with stale listeners calling setState) and
the new one. The Effect 2 cleanup now runs with `room = oldRoom`, calls
`oldRoom?.disconnect()` (already disconnected, no-op), but the old Room's event
listeners are NEVER removed.

In LiveKit v2, a disconnected Room can still fire `Disconnected` with a reason
during cleanup. This would call `setConnected(false)` from the stale listener —
potentially flipping the UI back to the "🎙 Voice" button even while the NEW room
is connected.

**Why it causes disconnects:**
After the reconnect flow, stale event listeners from the old Room can cause state
to be incorrectly reset (connected → false, participants → []), making the UI look
like it has disconnected even when the new room is healthy.

**Fix:**
In the `RoomEvent.Disconnected` handler, call `setRoom(null)` to clear the stale
room from state and trigger the cleanup effect to clean up properly:
```typescript
.on(RoomEvent.Disconnected, () => {
  setConnected(false)
  setIsReconnecting(false)
  setParticipants([])
  setLocalMuted(false)
  setRoom(null)   // ← add this
})
```

Also: in `handleConnect`, before creating a new Room, disconnect and null any existing
stale room:
```typescript
const handleConnect = async () => {
  // Clean up any previous stale room before creating a new one
  if (room) {
    room.disconnect()
    setRoom(null)
  }
  ...
  const newRoom = new Room({ ... })
```

---

## Bug 3 — Room created with no reconnection options

**Priority: HIGH**

**Root cause:**
`src/components/table/VoiceChat.tsx`, line 162:
```typescript
const newRoom = new Room()
```

No `reconnectPolicy`, no `adaptiveStream`, no `dynacast`, no audio capture defaults.

**Why it causes disconnects:**
Without explicit `reconnectPolicy`, LiveKit v2 uses 3 retries with exponential
backoff. In a weak WiFi environment (common for remote players), 3 retries may not
be enough. The room gives up and fires `Disconnected` when the network could have
recovered with a bit more patience.

Without `adaptiveStream`, audio bitrate doesn't adapt to network conditions —
a congested connection that could sustain lower-quality audio will instead drop.

**Fix:**
```typescript
const newRoom = new Room({
  adaptiveStream: true,
  dynacast: true,
  reconnectPolicy: {
    maxRetries: 10,
    retryDelay: 1000,
  },
  audioCaptureDefaults: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
})
```

---

## Bug 4 — TableTopBar not memoized; VoiceChat re-renders on every parent state change

**Priority: MEDIUM**

**Root cause:**
`src/components/table/tableclient/components/TableTopBar.tsx` — not wrapped in
`React.memo`.

`TableClient` re-renders on every Supabase realtime event (session updates, dice
rolls, etc.), which causes `TableTopBar` to re-render, which causes `VoiceChat` to
re-render. Because `VoiceChat`'s effects have stable dependency arrays, this does
NOT cause disconnects — but it is unnecessary re-render noise.

Two callback props passed to `TableTopBar` are recreated on every render:
```typescript
onToggleDiceLog={() => setShowDiceLog((v) => !v)}  // new function every render
onOpenShop={() => setShowShop(true)}               // new function every render
```

These cause React to consider the props "changed" even when nothing meaningful changed.

**Why it's worth fixing:**
Excessive re-renders of VoiceChat increase the risk that a future bug (wrong dep
array, accidental prop change) could trigger an unintended effect run. Memoizing now
prevents this category of bug entirely.

**Fix:**
Wrap `TableTopBar` in `React.memo`. Wrap the callback props in `useCallback`.

---

## Bug 5 — Duplicate `sessions` table subscriptions causing double re-renders

**Priority: MEDIUM**

**Root cause:**
Two separate Supabase channels both subscribe to `sessions` UPDATE for the same row:

1. `session-meta-{sessionId}` in `useSessionWithCampaign.ts`
   → calls `setSession(prev => { ...prev, current_map_id, status, ... })`

2. `session-status-{sessionId}` in `TableClient.tsx`
   → calls `setSession(s => { ...s, status })` AND `setSessionStatus(newStatus)`

Every `sessions` row UPDATE (GM switches map, pauses session, etc.) fires BOTH
handlers, causing two `setSession` calls and two React re-renders.

**Why it matters for voice:**
Each re-render chain hits `TableTopBar` and `VoiceChat`. While not a disconnect cause
today, this doubles the render pressure and could interact badly with future changes.

**Fix:**
Consolidate into one subscription. The `useSessionWithCampaign` subscription already
syncs the full session object including `status`. Remove the duplicate
`session-status-{sessionId}` channel from `TableClient.tsx` and derive `sessionStatus`
from the `session` object that `useSessionWithCampaign` already maintains:

```typescript
// In TableClient, replace the entire session-status subscription effect with:
useEffect(() => {
  if (!session?.status) return
  const s = session.status as SessionStatus
  const prev = prevStatusRef.current
  // Handle transitions
  if (s === 'paused' && prev !== 'paused') setShowPauseOverlay(true)
  if (s === 'active' && prev === 'paused') { setShowPauseOverlay(false); showSessionToast('▶ Session resumed!') }
  if (s !== prev) setSessionStatus(s)
  prevStatusRef.current = s
}, [session?.status])
```

---

## Summary Table

| # | File | Line(s) | Severity | Root Cause | Fix |
|---|------|---------|----------|------------|-----|
| 1 | TableClient.tsx | 83–106 | **CRITICAL** | 30-second idle `router.push()` kicks players out of voice during passive moments | Increase to 20 min or skip when `sessionStatus === 'active'` |
| 2 | VoiceChat.tsx | 171–175 | **HIGH** | `setRoom(null)` missing from `Disconnected` handler; stale event listeners on reconnect | Add `setRoom(null)` to Disconnected handler; pre-clean in handleConnect |
| 3 | VoiceChat.tsx | 162 | **HIGH** | Room created with no options — no retry policy, no adaptive stream | Pass full options object to `new Room({...})` |
| 4 | TableTopBar.tsx | whole file | MEDIUM | Not React.memo'd; re-renders VoiceChat on every game state change | `React.memo`, `useCallback` callbacks |
| 5 | TableClient.tsx + useSessionWithCampaign.ts | ~1000, ~60 | MEDIUM | Dual subscription to same `sessions` row → double re-renders | Collapse to one subscription, derive status from session object |

---

## Awaiting approval before writing any fix code.
