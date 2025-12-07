# DND721 – DM Suite + Shop (Web2-first)

Complete scaffold with:
- **DM Suite**: sessions, fog-of-war, initiative tracker, notes, handouts, lobby chat
- **Shop**: item grid, cart, checkout, *sponsored monsters*
- **Play**: battle map + dice
- **Editor**: placeholder audio tooling (export flow later)

> Web2 now. We'll swap in wallets + marketing wallet later per your plan.

## Tech
Node 20 • Next.js 14 (App Router) • React 18 • Tailwind 3.4 • TS 5 • Supabase client (optional) • LiveKit (optional)

## Quick start
```bash
pnpm i    # or npm i / yarn
cp .env.local.example .env.local
pnpm dev
```
- Visit **/dm** to create/open sessions
- Visit **/shop** to add items and sponsored monsters; **/shop/checkout** to "pay" with demo credits
- **/dm/sessions/[id]?role=player** opens a player-safe view (fog hidden by overlay)
- **/editor** is the editor workspace placeholder

## Notes
- All DM data (sessions, notes, handouts) + cart are stored in `localStorage` for now.
- The `FogOfWarOverlay` lets you *click-drag* rectangles to reveal areas.
- Initiative list is drag-sortable (client-side) and supports next-turn cycling.

## Supabase (optional early)
SQL to create `characters` table (if you want to persist characters now) is similar to the previous scaffold.

## Roadmap Hooks
- Replace demo credits with on-chain **DND721 token** and a **Marketing Wallet**.
- Wire shop purchases to spawn goblins/ogres into the active session.
- Add roles and auth (DM / Player / Editor), plus server routes.
