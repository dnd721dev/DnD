# Voice Chat Audit
All files read before any code was changed.

---

## SECTION A — Component lifecycle

### A1. What does VoiceChat's main useEffect do?

VoiceChat has **three** useEffects (not one):

**Effect 1 — Token pre-fetch** (`[url, roomName, sessionId]`):
Fires once on mount. Fetches a token silently and caches it in `tokenRef.current`.
Dependencies are all stable string primitives, so this only runs once. ✓

**Effect 2 — Disconnect on unmount** (`[room]`):
```typescript
useEffect(() => {
  return () => { room?.disconnect() }
}, [room])
```
Registers a cleanup function that disconnects the room.
Runs EVERY TIME `room` state changes (null → Room on connect; Room → null on leave).

**Effect 3 — beforeunload handler** (`[room]`):
```typescript
useEffect(() => {
  const handler = () => room?.disconnect()
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [room])
```
Re-attaches the beforeunload listener every time `room` changes.

### A2. Is the Room object created inside a useEffect or outside it?

**OUTSIDE a useEffect.** The Room is created inside `handleConnect()`, an async function
called when the user clicks the "🎙 Voice" button:
```typescript
const handleConnect = async () => {
  ...
  const newRoom = new Room()   // ← created here, on button click
  newRoom.on(...)
  await newRoom.connect(url, token)
  setRoom(newRoom)             // ← stored in useState
}
```

The Room is NOT in a useRef. It lives in `useState<Room | null>`.

This means:
- `setRoom(newRoom)` triggers a re-render of VoiceChat.
- Both `[room]`-dependent effects run their cleanup + setup on that re-render.
- Every time `room` state value changes (connect, leave), both effects re-run.

### A3. Is room.connect() called inside a useEffect?

**No.** `room.connect()` is called inside `handleConnect()`, a user-triggered async function
attached to the connect button. It does NOT live in a useEffect.

What triggers it to run: only the user clicking "🎙 Voice".
Could a parent state change cause it to re-run? **No**, because it's an event handler, not
an effect. Re-renders of VoiceChat do not call `handleConnect` automatically.

### A4. Where is VoiceChat rendered in the component tree?

```
TableClient (holds all game state)
  └── topBar (JSX variable, reassigned every render)
        └── TableTopBar (NOT React.memo wrapped)
              └── VoiceChat  ← rendered directly in header, no condition
```

**TableTopBar is NOT wrapped in React.memo.**
Every re-render of `TableClient` (from realtime events, state changes) causes
`TableTopBar` to re-render, which causes `VoiceChat` to re-render.

**VoiceChat itself has no conditional rendering** — it is always present in
`TableTopBar`'s JSX. No `{showVoice && <VoiceChat />}` pattern.

**CRITICAL: Early returns in TableClient UNMOUNT VoiceChat.**
VoiceChat only mounts when TableClient reaches its final return statement.
These guards run BEFORE topBar is ever rendered:

For players:
- `if (!hasMounted)` → skeleton, NO VoiceChat
- `if (loading)` → spinner, NO VoiceChat
- `if (error || !session)` → error text, NO VoiceChat
- `if (!walletLower)` → wallet prompt, NO VoiceChat
- `if (charsLoading)` → loading text, NO VoiceChat ← can re-trigger
- `if (charsError || !selectedCharacter)` → error, NO VoiceChat

For GMs: fewer gates but same first three apply.

If any of these guards flip TRUE after VoiceChat is already mounted, VoiceChat
unmounts and the Room disconnects.

**VoiceChat is inside a conditional render? → NO**, but TableClient has early returns
that could unmount it. Under normal gameplay these are one-time transitions (loading →
loaded). They do not cycle repeatedly.

### A5. Is there a key prop on VoiceChat or any parent that changes?

Searched all relevant files. **No changing `key` prop** found on VoiceChat, TableTopBar,
or any wrapping `<div>` in either the GM or player return branches.

The `topBar` JSX variable is rendered as the first child of the outer div in both
the GM return and the player return. React reconciles by position and component type,
so TableTopBar (and VoiceChat inside it) are treated as the SAME instance across
re-renders. No key-prop-forced unmount. ✓

---

## SECTION B — Token lifecycle

### B6. What TTL is set on the token?

```typescript
// src/app/api/livekit-token/route.ts, line 52–55
const at = new AccessToken(apiKey, apiSecret, {
  identity,
  ttl: '8h',   ← 8 hours
})
```

Token TTL is **8 hours**. This is NOT causing expiry-related disconnects.
VoiceChat also caches the token and refreshes if older than 7 hours (`TOKEN_REFRESH_MS`).
Token expiry is **not the problem**. ✓

### B7. Is the token fetched once or on every attempt?

**Fetched once on mount** (Effect 1), then cached in `tokenRef.current`.
On connect, if the cached token is < 7 hours old it is reused. Otherwise a fresh
one is fetched. This is a well-designed single-fetch pattern. ✓

### B8. Is the token stored in a ref or state?

```typescript
const tokenRef = useRef<{ value: string; fetchedAt: number } | null>(null)
```

**Stored in a ref.** Does not trigger re-renders. ✓

---

## SECTION C — Supabase realtime interference

### C9. All Supabase realtime subscriptions in TableClient and VoiceChat

**VoiceChat.tsx:** Zero Supabase subscriptions. ✓

**TableClient.tsx (direct):**
- `session-status-{sessionId}` channel — listens to `sessions` UPDATE for the session row.
  Calls `setSession(...)` and `setSessionStatus(...)` on any session update.

**useSessionWithCampaign.ts (called by TableClient):**
- `session-meta-{sessionId}` channel — ALSO listens to `sessions` UPDATE for the same row.
  Calls `setSession(...)` on any session update.

**useSessionRolls.ts (called by TableClient):**
- `session-rolls-rt-{sessionId}` channel — listens to `session_rolls` INSERT.
  Calls `setDiceLog(...)` on new dice rolls.

**MapBoard.tsx / MapBoardView.tsx (rendered inside mapSection):**
Multiple channels for token positions, fog data, initiative, etc. (See MapBoard/MapBoardView).

### C10. Do realtime events update state in a VoiceChat ancestor?

**Yes.** Both `session-status` and `session-meta` channels update `session` state in
`TableClient`, which is VoiceChat's top-level ancestor. Every session UPDATE event
(triggered by GM switching maps, pausing session, etc.) causes:

1. `setSession(...)` called in `useSessionWithCampaign` (new object reference)
2. `setSession(...)` called AGAIN in `TableClient`'s own subscription
3. Two re-renders of `TableClient` per session update
4. Each re-render propagates to `TableTopBar` (not React.memo'd)
5. Each re-render propagates to `VoiceChat`

However, VoiceChat's effects (`[url, roomName, sessionId]`, `[room]`) only re-run if
those specific values change — all stable primitives. So re-renders alone do NOT
disconnect the room. This causes unnecessary renders but is not the disconnect cause.

### C11. Is there a subscription that fires very frequently?

Token position updates (from MapBoard) can fire many times per minute when tokens are
being dragged. This updates state in MapBoard/MapBoardView, NOT in TableClient directly.
These are lower in the tree than VoiceChat.

Dice roll inserts fire on every roll — updates diceLog state in TableClient, but
`diceLog` is NOT in VoiceChat's prop chain. VoiceChat does not re-render from dice rolls.

The most impactful frequent trigger is any `sessions` table UPDATE (map switch, etc.)
which causes the double re-render described in C10. Not disconnect-causing but noisy.

---

## SECTION D — Next.js specific issues

### D12. Any router.refresh() / router.push() calls that could run on a timer?

**CRITICAL FINDING — 30-SECOND IDLE TIMER FOR PLAYERS:**

```typescript
// TableClient.tsx, lines 83–106
const resetIdleTimer = useCallback(() => {
  if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
  idleTimerRef.current = setTimeout(() => {
    const target = campaignId ? `/campaigns/${campaignId}` : '/campaigns'
    router.push(target)   // ← NAVIGATES AWAY AFTER 30 SECONDS OF INACTIVITY
  }, 30_000)              // ← 30_000ms = 30 SECONDS
}, [campaignId, router])

useEffect(() => {
  if (isGm) return          // GM is exempt
  if (!hasMounted) return
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
  const handle = () => resetIdleTimer()
  resetIdleTimer()          // arms immediately on mount
  events.forEach((ev) => window.addEventListener(ev, handle, { passive: true }))
  ...
}, [isGm, hasMounted, resetIdleTimer])
```

**The timer fires after 30 seconds of NO mouse movement, clicks, or keystrokes.**

In a tabletop session, a player who is:
- Listening to the GM describe a scene
- Watching the GM move tokens on the map
- Sitting back while someone else takes their turn
- Just talking in voice chat without touching the keyboard/mouse

…will be kicked to `/campaigns/` after exactly 30 seconds. This triggers a full
client-side navigation that UNMOUNTS TableClient, UNMOUNTS TableTopBar, and UNMOUNTS
VoiceChat. The Room disconnects.

The player then navigates back to the session table and reconnects to voice. If they
remain idle again (watching, listening, talking), they are kicked again in 30 seconds.

**This is the primary cause of the repeated disconnect loop.**

No other `router.push()`, `router.refresh()`, or `window.location.reload()` was found
in TableClient, TableTopBar, or VoiceChat.

### D13. Dynamic imports or Suspense boundaries?

No Suspense boundaries were found in TableClient.tsx or TableTopBar.
No dynamic imports wrap VoiceChat.
TableClientShell.tsx does NOT exist as a file (Glob returned no match).
The table page directly renders TableClient.

### D14. reactStrictMode in next.config.js

```javascript
// next.config.js — full file:
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = { '@react-native-async-storage/async-storage': false }
    return config
  },
}
```

**reactStrictMode is NOT set.** Effects do not double-invoke. This is not a factor. ✓

---

## SECTION E — LiveKit specific issues

### E15. Version of livekit-client

```json
"livekit-client": "^2.16.0"
```

**Version 2.16.0** — this is current and well past the 1.15 threshold where reconnection
bugs existed. Version is not the cause. ✓

### E16. Room configured with reconnection options?

```typescript
// VoiceChat.tsx, line 162 inside handleConnect():
const newRoom = new Room()
```

**No options passed.** No `adaptiveStream`, no `dynacast`, no `reconnectPolicy`.
LiveKit v2 has built-in reconnection by default, but without explicit configuration:
- `adaptiveStream` is off → bitrate does not adapt to network conditions
- `dynacast` is off → all tracks published at full resolution regardless of subscribers
- `reconnectPolicy` uses LiveKit's default (3 retries with exponential backoff)

The default reconnect policy may give up after a brief network blip. Configuring it
explicitly would improve resilience.

### E17. RoomEvent.Disconnected listener — what does it do?

```typescript
.on(RoomEvent.Disconnected, () => {
  setConnected(false)
  setIsReconnecting(false)
  setParticipants([])
  setLocalMuted(false)
  // ← NOTE: setRoom(null) is NOT called here
})
```

On disconnect, the UI returns to "🎙 Voice" button state.
`room` state still holds the disconnected Room object.
Event listeners attached to the old Room are NOT cleaned up here.

If the player clicks "Voice" again, `handleConnect` creates a NEW Room and calls
`setRoom(newRoom)`. The old disconnected Room's event handlers (`setConnected`,
`setParticipants`, etc.) are NEVER removed because they were attached inline to
the old room object inside `handleConnect`. If the old Room fires any late events,
they will call setState on the now-stale room's context (zombie listener issue).

### E18. RoomEvent.Reconnecting / Reconnected listeners?

Both are present:
```typescript
.on(RoomEvent.Reconnecting, () => {
  setIsReconnecting(true)
})
.on(RoomEvent.Reconnected, () => {
  setIsReconnecting(false)
  setConnected(true)
  void rebuildParticipants(newRoom)
})
```

Reconnection UI (amber "Reconnecting…" indicator) is shown when `connected && isReconnecting`.
However, if `Disconnected` fires before the player sees the reconnecting state (very brief
network loss), they go straight to the "🎙 Voice" button with no indication of what happened.

**Note on event ordering in LiveKit v2:**
- `Reconnecting` fires BEFORE `Disconnected`
- If reconnection succeeds: `Reconnecting` → `Reconnected` (room stays connected)
- If reconnection fails: `Reconnecting` → `Disconnected` (room terminates)

The handlers are correctly implemented for this sequence. ✓

---

## DUAL SUBSCRIPTION NOTE

`TableClient.tsx` and `useSessionWithCampaign.ts` both subscribe to `sessions` UPDATE
for the same row via two separate channels:

- `session-meta-{sessionId}` (in useSessionWithCampaign)
- `session-status-{sessionId}` (in TableClient)

Both call `setSession(...)`. Every sessions UPDATE causes 2 separate state updates and
2 re-renders of TableClient. This doubles the render noise but does not cause voice
disconnects directly.
