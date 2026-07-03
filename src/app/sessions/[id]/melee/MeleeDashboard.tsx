'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WEAPON_DB } from '@/components/character-sheet/equipment-db'
import type { InventoryItem } from '@/components/character-sheet/types'
import { getClassResources } from '@/lib/classResources'
import type { ClassKey } from '@/lib/subclasses'

// ─────────────────────────────────────────────────────────────────────────────
// Melee Dashboard — a purpose-built martial combat console (the fighter/rogue/
// barbarian/monk/paladin/ranger equivalent of the Spell Dashboard). Handles
// the complex per-class mechanics that don't fit in the table sidebar:
//
//   · weapon attacks vs a targeted token (adv/dis, crit doubling, auto-apply)
//   · damage RIDERS layered onto a hit: Sneak Attack, Rage bonus, Hunter's
//     Mark, Battle Master maneuvers (spends a superiority die), Divine Smite
//     (spends a spell slot, scales with slot level)
//   · class resources (rage uses, ki, second wind, action surge, superiority
//     dice, lay-on-hands pool) persisted to characters.resource_state
//   · signature abilities with real effects: Second Wind heals, Action Surge
//     refunds your action, Flurry of Blows rolls both strikes, Lay on Hands
//     heals from the pool, Reckless Attack grants advantage
//   · action-economy tracking (action / bonus / reaction) persisted to
//     characters.action_state so the table view stays in sync
// ─────────────────────────────────────────────────────────────────────────────

type CharRow = {
  id: string
  name: string | null
  level: number | null
  main_job: string | null
  subclass: string | null
  abilities: Record<string, any> | null
  hit_points_current: number | null
  hit_points_max: number | null
  ac: number | null
  armor_class: number | null
  inventory_items: InventoryItem[] | null
  resource_state: Record<string, any> | null
  action_state: Record<string, any> | null
  spell_slots: Record<string, number> | null
  wallet_address: string
}

type Token = {
  id: string
  label: string
  type: string
  hp: number | null
  current_hp: number | null
  ac: number | null
  owner_wallet: string | null
  map_id: string | null
  hidden: boolean | null
}

// ── 5e martial math ───────────────────────────────────────────────────────────

function abilityMod(score: any): number {
  const s = Number(score)
  return Number.isFinite(s) ? Math.floor((s - 10) / 2) : 0
}

function proficiencyBonus(level: number): number {
  if (level >= 17) return 6
  if (level >= 13) return 5
  if (level >= 9) return 4
  if (level >= 5) return 3
  return 2
}

/** 2024 Martial Arts die: d6 (1–4), d8 (5–10), d10 (11–16), d12 (17–20). */
function martialArtsDie(level: number): string {
  if (level >= 17) return 'd12'
  if (level >= 11) return 'd10'
  if (level >= 5) return 'd8'
  return 'd6'
}

/** Sneak Attack dice: 1d6 at L1, +1d6 every odd level. */
function sneakDiceCount(level: number): number {
  return Math.ceil(level / 2)
}

/** Rage damage bonus: +2 (1–8), +3 (9–15), +4 (16–20). */
function rageBonus(level: number): number {
  if (level >= 16) return 4
  if (level >= 9) return 3
  return 2
}

/** Battle Master superiority die size: d8 → d10 (L10) → d12 (L18). */
function superiorityDie(level: number): string {
  if (level >= 18) return 'd12'
  if (level >= 10) return 'd10'
  return 'd8'
}

/** Battle Master dice count: 4 (L3), 5 (L7), 6 (L15). */
function superiorityDiceMax(level: number): number {
  if (level >= 15) return 6
  if (level >= 7) return 5
  return 4
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}

function rollDice(count: number, sides: number): { total: number; rolls: number[] } {
  const rolls = Array.from({ length: count }, () => rollDie(sides))
  return { total: rolls.reduce((a, b) => a + b, 0), rolls }
}

const MARTIAL_CLASSES = ['barbarian', 'fighter', 'monk', 'rogue', 'paladin', 'ranger']

type RiderKey = 'sneak' | 'rage' | 'hunters_mark' | 'maneuver' | 'smite'

// ─────────────────────────────────────────────────────────────────────────────

export function MeleeDashboard({ sessionId }: { sessionId: string }) {
  const [wallet, setWallet] = useState<string | null>(null)
  const [characters, setCharacters] = useState<CharRow[]>([])
  const [charId, setCharId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [encounterId, setEncounterId] = useState<string | null>(null)
  const [tokens, setTokens] = useState<Token[]>([])
  const [targetId, setTargetId] = useState('')

  // Attack state
  const [rollMode, setRollMode] = useState<'normal' | 'adv' | 'dis'>('normal')
  const [lastHit, setLastHit] = useState(false)
  const [lastCrit, setLastCrit] = useState(false)
  const [riders, setRiders] = useState<Set<RiderKey>>(new Set())
  const [smiteSlot, setSmiteSlot] = useState(1)
  const [log, setLog] = useState<{ id: string; text: string; kind: 'hit' | 'miss' | 'info' }[]>([])

  useEffect(() => {
    const w = typeof window !== 'undefined' ? window.localStorage.getItem('dnd721_wallet') : null
    setWallet(w ? w.toLowerCase() : null)
  }, [])

  // ── Load characters + encounter + tokens ────────────────────────────────────
  useEffect(() => {
    if (!wallet) { setLoading(false); return }
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: chars, error: charErr } = await supabase
        .from('characters')
        .select('id, name, level, main_job, subclass, abilities, hit_points_current, hit_points_max, ac, armor_class, inventory_items, resource_state, action_state, spell_slots, wallet_address')
        .eq('wallet_address', wallet)
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (charErr) { setError(charErr.message); setLoading(false); return }
      const rows = (chars as any[] as CharRow[]) ?? []
      setCharacters(rows)
      // Prefer a martial class as the default selection
      const martial = rows.find(r => MARTIAL_CLASSES.includes(String(r.main_job ?? '').toLowerCase()))
      setCharId((prev) => prev ?? martial?.id ?? rows[0]?.id ?? null)

      const { data: session } = await supabase
        .from('sessions')
        .select('current_map_id')
        .eq('id', sessionId)
        .maybeSingle()
      let mapId = (session as any)?.current_map_id ?? null
      const { data: sp } = await supabase
        .from('session_players')
        .select('current_map_id')
        .eq('session_id', sessionId)
        .eq('wallet_address', wallet)
        .maybeSingle()
      if ((sp as any)?.current_map_id) mapId = (sp as any).current_map_id

      const { data: enc } = await supabase
        .from('encounters')
        .select('id')
        .eq('session_id', sessionId)
        .limit(1)
        .maybeSingle()
      const eid = (enc as any)?.id ?? null
      setEncounterId(eid)

      if (eid) {
        let q = supabase
          .from('tokens')
          .select('id, label, type, hp, current_hp, ac, owner_wallet, map_id, hidden')
          .eq('encounter_id', eid)
        if (mapId) q = (q as any).or(`map_id.eq.${mapId},map_id.is.null`)
        const { data: toks } = await q
        if (!cancelled) setTokens(((toks ?? []) as Token[]).filter(t => !t.hidden))
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [wallet, sessionId])

  // Realtime token HP updates
  useEffect(() => {
    if (!encounterId) return
    const ch = supabase
      .channel(`melee-dash-tokens-${encounterId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tokens', filter: `encounter_id=eq.${encounterId}` },
        (payload) => {
          const row = (payload as any).new
          setTokens(prev => prev.map(t => t.id === row.id ? { ...t, ...row } : t))
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [encounterId])

  const char = useMemo(() => characters.find(c => c.id === charId) ?? null, [characters, charId])
  const classKey = String(char?.main_job ?? '').toLowerCase()
  const subclassKey = String(char?.subclass ?? '').toLowerCase().replace(/\s+/g, '_')
  const level = Number(char?.level ?? 1)
  const pb = proficiencyBonus(level)
  const str = abilityMod(char?.abilities?.str)
  const dex = abilityMod(char?.abilities?.dex)
  const isBattleMaster = classKey === 'fighter' && subclassKey.includes('battle')
  const isMartial = MARTIAL_CLASSES.includes(classKey)

  const resourceState = (char?.resource_state ?? {}) as Record<string, any>
  const actionState = (char?.action_state ?? {}) as Record<string, any>
  const raging = !!actionState.raging

  // Class resource definitions (max values) merged with persisted currents.
  const resources = useMemo(() => {
    const defs = getClassResources(classKey as ClassKey, level)
    const out = defs.map(d => ({
      ...d,
      current: Number.isFinite(Number(resourceState[d.key])) ? Number(resourceState[d.key]) : d.max,
    }))
    // Battle Master superiority dice are subclass-scoped — synthesize them.
    if (isBattleMaster && level >= 3) {
      const key = 'fighter.superiority_dice'
      out.push({
        key,
        name: `Superiority Dice (${superiorityDie(level)})`,
        max: superiorityDiceMax(level),
        current: Number.isFinite(Number(resourceState[key])) ? Number(resourceState[key]) : superiorityDiceMax(level),
        recharge: 'short_rest',
        die: superiorityDie(level),
        note: 'Fuel Battle Master maneuvers.',
      } as any)
    }
    return out
  }, [classKey, level, resourceState, isBattleMaster])

  function getResource(key: string): { current: number; max: number } {
    const r = resources.find(x => x.key === key)
    return r ? { current: r.current, max: r.max } : { current: 0, max: 0 }
  }

  // ── Persistence helpers ─────────────────────────────────────────────────────
  const updateResourceState = useCallback(async (patch: Record<string, number>) => {
    if (!char) return
    const merged = { ...(char.resource_state ?? {}), ...patch }
    setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, resource_state: merged } : c))
    await supabase.from('characters').update({ resource_state: merged }).eq('id', char.id)
  }, [char])

  const updateActionState = useCallback(async (patch: Record<string, any>) => {
    if (!char) return
    const merged = { ...(char.action_state ?? {}), ...patch }
    setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, action_state: merged } : c))
    await supabase.from('characters').update({ action_state: merged }).eq('id', char.id)
  }, [char])

  const applyHp = useCallback(async (delta: number) => {
    if (!char) return
    const cur = Number(char.hit_points_current ?? 0)
    const max = Number(char.hit_points_max ?? cur)
    const next = Math.max(0, Math.min(max, cur + delta))
    setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, hit_points_current: next } : c))
    await supabase.from('characters').update({ hit_points_current: next }).eq('id', char.id)
    await supabase.from('tokens').update({ current_hp: next }).eq('character_id', char.id)
  }, [char])

  const postRoll = useCallback(async (label: string, formula: string, result: number) => {
    await supabase.from('session_rolls').insert({
      session_id: sessionId,
      roll_type: 'custom',
      label,
      formula,
      result_total: result,
      roller_name: char?.name ?? 'Adventurer',
      roller_wallet: wallet,
    })
  }, [sessionId, char, wallet])

  function pushLog(text: string, kind: 'hit' | 'miss' | 'info' = 'info') {
    setLog(prev => [{ id: `${Date.now()}-${Math.random()}`, text, kind }, ...prev].slice(0, 12))
  }

  // ── Weapons ─────────────────────────────────────────────────────────────────
  const equippedWeapons = useMemo(() => {
    const items = (char?.inventory_items ?? []) as InventoryItem[]
    return items
      .filter(it => it.equipped && it.kind === 'weapon' && it.key)
      .map(it => ({ item: it, weapon: (WEAPON_DB as any)[it.key!] ?? null }))
      .filter(x => x.weapon !== null) as { item: InventoryItem; weapon: NonNullable<(typeof WEAPON_DB)[string]> }[]
  }, [char])

  function weaponMods(weapon: (typeof WEAPON_DB)[string]) {
    const finesse = weapon.properties.includes('finesse' as any)
    const ranged = weapon.attackType === 'ranged'
    const mod = finesse || ranged ? Math.max(str, dex) : str
    return { atk: mod + pb, dmg: mod }
  }

  const target = tokens.find(t => t.id === targetId) ?? null

  // ── Attack roll ─────────────────────────────────────────────────────────────
  const doAttack = useCallback(async (label: string, atkBonus: number) => {
    const effMode = actionState.reckless && classKey === 'barbarian' && rollMode === 'normal' ? 'adv' : rollMode
    const r1 = rollDie(20)
    const r2 = rollDie(20)
    const d20 = effMode === 'adv' ? Math.max(r1, r2) : effMode === 'dis' ? Math.min(r1, r2) : r1
    const total = d20 + atkBonus
    const ac = target?.ac
    let outcome: string
    let hit: boolean
    if (d20 === 1) { hit = false; outcome = 'FUMBLE (nat 1)' }
    else if (d20 === 20) { hit = true; outcome = 'CRIT (nat 20)!' }
    else if (ac != null) { hit = total >= ac; outcome = hit ? `HIT vs AC ${ac}` : `MISS vs AC ${ac}` }
    else { hit = true; outcome = `${total} (no target AC)` }
    setLastHit(hit)
    setLastCrit(d20 === 20)
    const modeNote = effMode === 'adv' ? ' (Adv)' : effMode === 'dis' ? ' (Dis)' : ''
    const sign = atkBonus >= 0 ? '+' : ''
    await postRoll(`${label}${modeNote}${target ? ` → ${target.label}` : ''}`, `1d20${sign}${atkBonus}`, total)
    pushLog(`${label}: ${total} — ${outcome}`, hit ? 'hit' : 'miss')
  }, [rollMode, target, postRoll, actionState.reckless, classKey])

  // ── Damage roll with riders ─────────────────────────────────────────────────
  const doDamage = useCallback(async (label: string, damageDice: string, dmgMod: number) => {
    if (!char) return
    const m = damageDice.match(/^(\d+)d(\d+)$/)
    const baseCount = m ? Number(m[1]) : 1
    const sides = m ? Number(m[2]) : 8
    const crit = lastCrit
    const parts: string[] = []
    let total = 0

    const base = rollDice(crit ? baseCount * 2 : baseCount, sides)
    total += base.total + dmgMod
    parts.push(`${crit ? baseCount * 2 : baseCount}d${sides}${dmgMod ? (dmgMod > 0 ? `+${dmgMod}` : dmgMod) : ''}`)

    // Riders — each adds dice/flat damage and may spend a resource.
    if (riders.has('sneak') && classKey === 'rogue') {
      const n = sneakDiceCount(level)
      const r = rollDice(crit ? n * 2 : n, 6)
      total += r.total
      parts.push(`Sneak ${crit ? n * 2 : n}d6`)
    }
    if (riders.has('rage') && classKey === 'barbarian' && raging) {
      total += rageBonus(level)
      parts.push(`Rage +${rageBonus(level)}`)
    }
    if (riders.has('hunters_mark') && classKey === 'ranger') {
      const r = rollDice(crit ? 2 : 1, 6)
      total += r.total
      parts.push(`Mark ${crit ? 2 : 1}d6`)
    }
    if (riders.has('maneuver') && isBattleMaster) {
      const { current } = getResource('fighter.superiority_dice')
      if (current > 0) {
        const dieSides = Number(superiorityDie(level).slice(1))
        const r = rollDice(crit ? 2 : 1, dieSides)
        total += r.total
        parts.push(`Maneuver ${crit ? 2 : 1}${superiorityDie(level)}`)
        await updateResourceState({ 'fighter.superiority_dice': current - 1 })
      }
    }
    if (riders.has('smite') && classKey === 'paladin') {
      const slots = (char.spell_slots ?? {}) as Record<string, number>
      const have = Number(slots[String(smiteSlot)] ?? 0)
      if (have > 0) {
        const n = 1 + Math.min(smiteSlot, 4) // 2d8 at L1 slot, +1d8/level, max 5d8 → base 1+slot capped
        const diceN = Math.min(5, 1 + smiteSlot)
        const r = rollDice(crit ? diceN * 2 : diceN, 8)
        total += r.total
        parts.push(`Smite ${crit ? diceN * 2 : diceN}d8 (L${smiteSlot} slot)`)
        void n
        const nextSlots = { ...slots, [String(smiteSlot)]: have - 1 }
        setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, spell_slots: nextSlots } : c))
        await supabase.from('characters').update({ spell_slots: nextSlots }).eq('id', char.id)
      } else {
        pushLog(`No level ${smiteSlot} slot left for Divine Smite`, 'miss')
      }
    }

    const finalTotal = Math.max(1, total)
    const formula = parts.join(' + ')
    await postRoll(`${label} — Damage${crit ? ' (CRIT!)' : ''}${target ? ` → ${target.label}` : ''}`, formula, finalTotal)
    pushLog(`${label} damage: ${finalTotal} (${formula})`, 'hit')

    // Auto-apply to target if the preceding attack hit.
    if (lastHit && target) {
      const { error: rpcErr } = await supabase.rpc('apply_combat_damage', { p_token_id: target.id, p_amount: finalTotal })
      if (rpcErr) console.error('[MeleeDashboard] apply_combat_damage failed', rpcErr)
      else pushLog(`Applied ${finalTotal} damage to ${target.label}`, 'info')
    }
    setLastHit(false)
    setLastCrit(false)
    // One-shot riders clear after use; rage persists while raging.
    setRiders(prev => {
      const next = new Set(prev)
      next.delete('sneak'); next.delete('maneuver'); next.delete('smite')
      return next
    })
  }, [char, lastCrit, lastHit, riders, classKey, level, raging, isBattleMaster, smiteSlot, target, postRoll, updateResourceState, getResource])

  // ── Signature abilities ─────────────────────────────────────────────────────
  async function useSecondWind() {
    const { current } = getResource('fighter.second_wind')
    if (current <= 0) return
    const heal = rollDie(10) + level
    await updateResourceState({ 'fighter.second_wind': current - 1 })
    await applyHp(heal)
    await postRoll('Second Wind', `1d10+${level}`, heal)
    pushLog(`Second Wind: healed ${heal} HP`, 'hit')
    await updateActionState({ bonus_used_turn: true })
  }

  async function useActionSurge() {
    const { current } = getResource('fighter.action_surge')
    if (current <= 0) return
    await updateResourceState({ 'fighter.action_surge': current - 1 })
    await updateActionState({ action_used_turn: false })
    pushLog('Action Surge — your Action is refreshed this turn!', 'hit')
  }

  async function toggleRage() {
    if (raging) {
      await updateActionState({ raging: false })
      setRiders(prev => { const n = new Set(prev); n.delete('rage'); return n })
      pushLog('Rage ended.', 'info')
      return
    }
    const { current } = getResource('barbarian.rage')
    if (current <= 0) return
    await updateResourceState({ 'barbarian.rage': current - 1 })
    await updateActionState({ raging: true, bonus_used_turn: true })
    setRiders(prev => new Set(prev).add('rage'))
    pushLog(`RAGE! +${rageBonus(level)} melee damage, resistance to B/P/S.`, 'hit')
  }

  async function useFlurry() {
    const { current } = getResource('monk.ki')
    if (current <= 0) return
    await updateResourceState({ 'monk.ki': current - 1 })
    await updateActionState({ bonus_used_turn: true })
    const die = Number(martialArtsDie(level).slice(1))
    const s1 = rollDie(die) + Math.max(str, dex)
    const s2 = rollDie(die) + Math.max(str, dex)
    await postRoll('Flurry of Blows', `2×(1${martialArtsDie(level)}+${Math.max(str, dex)})`, s1 + s2)
    pushLog(`Flurry of Blows: ${s1} + ${s2} = ${s1 + s2} damage (roll attacks separately if needed)`, 'hit')
  }

  async function useLayOnHands(amount: number) {
    const { current } = getResource('paladin.lay_on_hands')
    const spend = Math.min(amount, current)
    if (spend <= 0) return
    await updateResourceState({ 'paladin.lay_on_hands': current - spend })
    await applyHp(spend)
    await postRoll('Lay on Hands', `${spend} pts`, spend)
    pushLog(`Lay on Hands: healed ${spend} HP (${current - spend} left in pool)`, 'hit')
    await updateActionState({ bonus_used_turn: true })
  }

  async function shortRest() {
    const patch: Record<string, number> = {}
    for (const r of resources) {
      if ((r as any).recharge === 'short_rest') patch[r.key] = r.max
    }
    if (Object.keys(patch).length) await updateResourceState(patch)
    pushLog('Short rest — short-rest resources restored.', 'info')
  }

  async function longRest() {
    const patch: Record<string, number> = {}
    for (const r of resources) patch[r.key] = r.max
    await updateResourceState(patch)
    await updateActionState({ raging: false, reckless: false, action_used_turn: false, bonus_used_turn: false, reaction_used_round: false })
    pushLog('Long rest — all resources restored.', 'info')
  }

  async function newTurn() {
    await updateActionState({ action_used_turn: false, bonus_used_turn: false, reckless: false })
    pushLog('New turn — action & bonus action refreshed.', 'info')
  }

  // ── Available riders for this class ─────────────────────────────────────────
  const availableRiders: { key: RiderKey; label: string; hint: string }[] = useMemo(() => {
    const out: { key: RiderKey; label: string; hint: string }[] = []
    if (classKey === 'rogue') out.push({ key: 'sneak', label: `Sneak Attack +${sneakDiceCount(level)}d6`, hint: 'Once per turn, needs advantage or an adjacent ally' })
    if (classKey === 'barbarian') out.push({ key: 'rage', label: `Rage +${rageBonus(level)}`, hint: raging ? 'Active while raging' : 'Enter Rage first' })
    if (classKey === 'ranger') out.push({ key: 'hunters_mark', label: "Hunter's Mark +1d6", hint: 'Requires the mark on your target' })
    if (isBattleMaster) out.push({ key: 'maneuver', label: `Maneuver +1${superiorityDie(level)}`, hint: 'Spends 1 superiority die' })
    if (classKey === 'paladin') out.push({ key: 'smite', label: 'Divine Smite', hint: 'Spends a spell slot on hit' })
    return out
  }, [classKey, level, raging, isBattleMaster])

  const hpCur = Number(char?.hit_points_current ?? 0)
  const hpMax = Number(char?.hit_points_max ?? 0)
  const acVal = char?.ac ?? char?.armor_class ?? 10

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return <div className="p-8 text-slate-400">Loading melee dashboard…</div>
  if (error) return <div className="p-8 text-red-400">{error}</div>
  if (!wallet) return <div className="p-8 text-slate-400">Connect your wallet to use the melee dashboard.</div>

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      <div className="flex items-center justify-between border-b border-amber-900/40 px-4 py-2">
        <h1 className="text-lg font-bold text-amber-200">⚔ Melee Dashboard</h1>
        <div className="flex items-center gap-2">
          {characters.length > 1 && (
            <select
              value={charId ?? ''}
              onChange={e => setCharId(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
            >
              {characters.map(c => (
                <option key={c.id} value={c.id}>{c.name ?? 'Unnamed'} (Lv{c.level} {c.main_job})</option>
              ))}
            </select>
          )}
          {!isMartial && char && (
            <span className="text-[11px] text-amber-400/80">
              {char.main_job} isn&apos;t a martial class — dashboard still works for weapon attacks.
            </span>
          )}
        </div>
      </div>

      {!char ? (
        <div className="p-8 text-slate-400">No character found for this wallet.</div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[280px_1fr_320px]">

          {/* ── LEFT: character + resources + economy ── */}
          <aside className="overflow-y-auto border-r border-amber-900/30 bg-gradient-to-b from-stone-950/80 to-slate-950 p-3 space-y-3">
            <div>
              <p className="text-sm font-bold text-amber-200">{char.name}</p>
              <p className="text-[11px] text-slate-400">Lv {level} {char.main_job}{char.subclass ? ` (${char.subclass})` : ''}</p>
            </div>

            {/* HP + AC */}
            <div className="rounded-lg border border-amber-900/40 bg-slate-950/60 p-2">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-amber-300/80 font-semibold">HP {hpCur}/{hpMax}</span>
                <span className="text-slate-400">AC {acVal}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${hpMax > 0 ? Math.min(100, (hpCur / hpMax) * 100) : 0}%` }}
                />
              </div>
              <div className="mt-1.5 flex gap-1">
                {[-5, -1, +1, +5].map(d => (
                  <button key={d} onClick={() => applyHp(d)}
                    className="flex-1 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-200 hover:border-amber-500/60">
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            </div>

            {/* Action economy */}
            <div className="rounded-lg border border-amber-900/40 bg-slate-950/60 p-2 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/70">Action Economy</p>
              {([['Action', 'action_used_turn'], ['Bonus Action', 'bonus_used_turn'], ['Reaction', 'reaction_used_round']] as const).map(([lbl, flag]) => (
                <button key={flag}
                  onClick={() => updateActionState({ [flag]: !actionState[flag] })}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-[11px] ${
                    actionState[flag] ? 'bg-slate-800 text-slate-500' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                  }`}>
                  <span>{lbl}</span>
                  <span>{actionState[flag] ? 'Used ✓' : 'Free'}</span>
                </button>
              ))}
              <button onClick={newTurn}
                className="mt-1 w-full rounded border border-amber-700/50 bg-amber-950/30 px-2 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-900/40">
                ↻ New Turn
              </button>
            </div>

            {/* Class resources */}
            <div className="rounded-lg border border-amber-900/40 bg-slate-950/60 p-2 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/70">Resources</p>
              {resources.filter(r => r.key !== 'hit_die').map(r => (
                <div key={r.key} className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="min-w-0 truncate text-slate-300" title={(r as any).note}>{r.name}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button onClick={() => updateResourceState({ [r.key]: Math.max(0, r.current - 1) })}
                      className="rounded border border-slate-700 bg-slate-900 px-1 text-slate-300 hover:border-amber-500/60">−</button>
                    <span className="w-10 text-center font-mono text-amber-200">{r.current}/{r.max}</span>
                    <button onClick={() => updateResourceState({ [r.key]: Math.min(r.max, r.current + 1) })}
                      className="rounded border border-slate-700 bg-slate-900 px-1 text-slate-300 hover:border-amber-500/60">+</button>
                  </span>
                </div>
              ))}
              <div className="flex gap-1 pt-1">
                <button onClick={shortRest} className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-amber-500/60">Short Rest</button>
                <button onClick={longRest} className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-amber-500/60">Long Rest</button>
              </div>
            </div>
          </aside>

          {/* ── CENTER: target + attacks + riders ── */}
          <main className="overflow-y-auto p-3 space-y-3">
            {/* Target + roll mode */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-900/40 bg-slate-950/60 p-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/70">Target</span>
              <select value={targetId} onChange={e => setTargetId(e.target.value)}
                className="min-w-[180px] flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200">
                <option value="">— pick a target —</option>
                {tokens.filter(t => t.owner_wallet?.toLowerCase() !== wallet).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label}{t.ac != null ? ` (AC ${t.ac})` : ''} — {t.current_hp ?? t.hp ?? '?'}/{t.hp ?? '?'} HP
                  </option>
                ))}
              </select>
              <div className="flex gap-1">
                {(['normal', 'adv', 'dis'] as const).map(m => (
                  <button key={m} onClick={() => setRollMode(m)}
                    className={`rounded px-2 py-1 text-[10px] font-semibold ${
                      rollMode === m ? 'bg-amber-600/40 text-amber-100 ring-1 ring-amber-500/50' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}>
                    {m === 'normal' ? 'Normal' : m === 'adv' ? 'Adv' : 'Dis'}
                  </button>
                ))}
                {classKey === 'barbarian' && (
                  <button onClick={() => updateActionState({ reckless: !actionState.reckless })}
                    title="Reckless Attack: advantage on STR melee attacks this turn; attacks against you have advantage"
                    className={`rounded px-2 py-1 text-[10px] font-semibold ${
                      actionState.reckless ? 'bg-red-800/50 text-red-200 ring-1 ring-red-500/50' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}>
                    Reckless
                  </button>
                )}
              </div>
            </div>

            {/* Weapon attacks */}
            <div className="rounded-lg border border-amber-900/40 bg-slate-950/60 p-2 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/70">Attacks</p>
              {equippedWeapons.length === 0 && classKey !== 'monk' && (
                <p className="text-[11px] text-slate-500">No equipped weapons — equip one on your character sheet, or use the generic attack below.</p>
              )}
              {equippedWeapons.map(({ item, weapon }) => {
                const mods = weaponMods(weapon)
                return (
                  <div key={item.id ?? weapon.key} className="flex flex-wrap items-center gap-2 rounded border border-slate-800 bg-slate-900/60 px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-100">
                      {weapon.name} <span className="text-[10px] font-normal text-slate-500">{weapon.damageDice} {weapon.damageType}</span>
                    </span>
                    <button onClick={() => doAttack(weapon.name, mods.atk)}
                      className="rounded border border-red-700/50 bg-red-950/40 px-2.5 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-900/50">
                      🎯 Attack {mods.atk >= 0 ? `+${mods.atk}` : mods.atk}
                    </button>
                    <button onClick={() => doDamage(weapon.name, weapon.damageDice, mods.dmg)}
                      className="rounded border border-amber-700/50 bg-amber-950/40 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-900/50">
                      💥 {weapon.damageDice}{mods.dmg ? `+${mods.dmg}` : ''}
                    </button>
                  </div>
                )
              })}
              {/* Unarmed strike — monk uses the Martial Arts die and DEX */}
              <div className="flex flex-wrap items-center gap-2 rounded border border-slate-800 bg-slate-900/60 px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-100">
                  Unarmed Strike
                  <span className="text-[10px] font-normal text-slate-500">
                    {classKey === 'monk' ? ` 1${martialArtsDie(level)} bludgeoning (Martial Arts)` : ' 1+STR bludgeoning'}
                  </span>
                </span>
                <button onClick={() => doAttack('Unarmed Strike', (classKey === 'monk' ? Math.max(str, dex) : str) + pb)}
                  className="rounded border border-red-700/50 bg-red-950/40 px-2.5 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-900/50">
                  🎯 Attack +{(classKey === 'monk' ? Math.max(str, dex) : str) + pb}
                </button>
                <button onClick={() => classKey === 'monk'
                  ? doDamage('Unarmed Strike', `1${martialArtsDie(level)}`, Math.max(str, dex))
                  : doDamage('Unarmed Strike', '1d1', str)}
                  className="rounded border border-amber-700/50 bg-amber-950/40 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-900/50">
                  💥 {classKey === 'monk' ? `1${martialArtsDie(level)}+${Math.max(str, dex)}` : `1+${str}`}
                </button>
              </div>
            </div>

            {/* Damage riders */}
            {availableRiders.length > 0 && (
              <div className="rounded-lg border border-amber-900/40 bg-slate-950/60 p-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300/70">
                  Damage Riders <span className="normal-case text-slate-500">(added to your next damage roll)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableRiders.map(r => {
                    const on = riders.has(r.key)
                    const disabled = r.key === 'rage' && !raging
                    return (
                      <button key={r.key} disabled={disabled}
                        onClick={() => setRiders(prev => {
                          const next = new Set(prev)
                          if (next.has(r.key)) next.delete(r.key); else next.add(r.key)
                          return next
                        })}
                        title={r.hint}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold transition disabled:opacity-40 ${
                          on ? 'bg-amber-600/40 text-amber-100 ring-1 ring-amber-500/60' : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-amber-600/50'
                        }`}>
                        {on ? '✓ ' : ''}{r.label}
                      </button>
                    )
                  })}
                  {riders.has('smite') && classKey === 'paladin' && (
                    <select value={smiteSlot} onChange={e => setSmiteSlot(Number(e.target.value))}
                      className="rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] text-amber-200">
                      {[1, 2, 3, 4, 5].map(l => {
                        const have = Number((char.spell_slots ?? {})[String(l)] ?? 0)
                        return <option key={l} value={l} disabled={have <= 0}>L{l} slot ({have} left)</option>
                      })}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Combat log */}
            <div className="rounded-lg border border-amber-900/40 bg-slate-950/60 p-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300/70">Combat Log</p>
              {log.length === 0 && <p className="text-[11px] italic text-slate-600">Roll an attack to get started.</p>}
              <ul className="space-y-0.5">
                {log.map(l => (
                  <li key={l.id} className={`text-[11px] ${l.kind === 'hit' ? 'text-emerald-300' : l.kind === 'miss' ? 'text-red-300' : 'text-slate-400'}`}>
                    {l.text}
                  </li>
                ))}
              </ul>
            </div>
          </main>

          {/* ── RIGHT: signature class abilities ── */}
          <aside className="overflow-y-auto border-l border-amber-900/30 bg-gradient-to-b from-stone-950/80 to-slate-950 p-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/70">Class Abilities</p>

            {classKey === 'barbarian' && (
              <AbilityButton
                title={raging ? 'End Rage' : `Rage (${getResource('barbarian.rage').current}/${getResource('barbarian.rage').max})`}
                desc={`Bonus Action. +${rageBonus(level)} melee damage, resistance to bludgeoning/piercing/slashing.`}
                onClick={toggleRage}
                active={raging}
                disabled={!raging && getResource('barbarian.rage').current <= 0}
              />
            )}

            {classKey === 'fighter' && (
              <>
                <AbilityButton
                  title={`Second Wind (${getResource('fighter.second_wind').current}/${getResource('fighter.second_wind').max})`}
                  desc={`Bonus Action. Heal 1d10+${level} HP.`}
                  onClick={useSecondWind}
                  disabled={getResource('fighter.second_wind').current <= 0}
                />
                <AbilityButton
                  title={`Action Surge (${getResource('fighter.action_surge').current}/${getResource('fighter.action_surge').max})`}
                  desc="Free. Take one additional Action this turn."
                  onClick={useActionSurge}
                  disabled={getResource('fighter.action_surge').current <= 0}
                />
                {isBattleMaster && (
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-[11px] text-slate-300">
                    <p className="font-semibold text-amber-200">Battle Master</p>
                    <p className="text-slate-400">
                      {getResource('fighter.superiority_dice').current}/{getResource('fighter.superiority_dice').max} superiority dice ({superiorityDie(level)}).
                      Toggle the Maneuver rider to add one to a damage roll. Maneuver DC {8 + pb + Math.max(str, dex)}.
                    </p>
                  </div>
                )}
              </>
            )}

            {classKey === 'monk' && (
              <>
                <AbilityButton
                  title={`Flurry of Blows (${getResource('monk.ki').current} ki)`}
                  desc={`Bonus Action, 1 ki. Two unarmed strikes (1${martialArtsDie(level)}+${Math.max(str, dex)} each).`}
                  onClick={useFlurry}
                  disabled={getResource('monk.ki').current <= 0}
                />
                <AbilityButton
                  title="Patient Defense"
                  desc="Bonus Action, 1 ki. Dodge — attacks against you have disadvantage."
                  onClick={async () => {
                    const { current } = getResource('monk.ki')
                    if (current <= 0) return
                    await updateResourceState({ 'monk.ki': current - 1 })
                    await updateActionState({ bonus_used_turn: true })
                    pushLog('Patient Defense — dodging until your next turn.', 'info')
                  }}
                  disabled={getResource('monk.ki').current <= 0}
                />
                <AbilityButton
                  title="Step of the Wind"
                  desc="Bonus Action, 1 ki. Dash or Disengage; jump distance doubled."
                  onClick={async () => {
                    const { current } = getResource('monk.ki')
                    if (current <= 0) return
                    await updateResourceState({ 'monk.ki': current - 1 })
                    await updateActionState({ bonus_used_turn: true })
                    pushLog('Step of the Wind — Dash/Disengage as a bonus action.', 'info')
                  }}
                  disabled={getResource('monk.ki').current <= 0}
                />
              </>
            )}

            {classKey === 'paladin' && (
              <>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2">
                  <p className="text-[11px] font-semibold text-amber-200">
                    Lay on Hands — {getResource('paladin.lay_on_hands').current}/{getResource('paladin.lay_on_hands').max} pool
                  </p>
                  <div className="mt-1 flex gap-1">
                    {[5, 10, 20].map(amt => (
                      <button key={amt} onClick={() => useLayOnHands(amt)}
                        disabled={getResource('paladin.lay_on_hands').current <= 0}
                        className="flex-1 rounded border border-emerald-800/50 bg-emerald-950/40 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-40">
                        +{amt} HP
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-[11px] text-slate-400">
                  <p className="font-semibold text-amber-200">Divine Smite</p>
                  Toggle the Smite rider before rolling damage — it spends the chosen slot and adds (1+slot)d8 radiant.
                </div>
              </>
            )}

            {classKey === 'rogue' && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-amber-200">Sneak Attack — {sneakDiceCount(level)}d6</p>
                <p>Toggle the Sneak rider before a damage roll (once per turn; you need advantage or an ally within 5 ft of the target).</p>
                <p className="font-semibold text-amber-200 pt-1">Cunning Action</p>
                <p>Dash, Disengage, or Hide as a Bonus Action — mark your Bonus Action used on the left.</p>
              </div>
            )}

            {classKey === 'ranger' && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-[11px] text-slate-400">
                <p className="font-semibold text-amber-200">Hunter&apos;s Mark</p>
                Bonus Action to mark a target; toggle the Mark rider to add 1d6 to hits against it.
              </div>
            )}

            {!isMartial && (
              <p className="text-[11px] italic text-slate-500">
                No martial class abilities for {char.main_job}. Use the Spell Dashboard for casting.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

function AbilityButton({ title, desc, onClick, disabled, active }: {
  title: string
  desc: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full rounded-lg border p-2 text-left transition disabled:opacity-40 ${
        active
          ? 'border-red-500/60 bg-red-950/40 ring-1 ring-red-500/40'
          : 'border-amber-900/40 bg-slate-900/50 hover:border-amber-600/50'
      }`}>
      <p className={`text-[12px] font-semibold ${active ? 'text-red-200' : 'text-amber-200'}`}>{title}</p>
      <p className="text-[10px] text-slate-400">{desc}</p>
    </button>
  )
}
