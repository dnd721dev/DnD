'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import type { Abilities } from '../../../types/character'
import type { CharacterSheetData } from '@/components/character-sheet/types'

import { CharacterHeader } from '@/components/character-sheet/CharacterHeader'
import { MulticlassLevelUpModal } from '@/components/character-sheet/MulticlassLevelUpModal'
import { LevelUpAsiModal } from '@/components/character-sheet/LevelUpAsiModal'
import { LevelUpSubclassModal } from '@/components/character-sheet/LevelUpSubclassModal'
import { WarlockInvocationsPanel } from '@/components/character-sheet/WarlockInvocationsPanel'
import { getRacialResources } from '@/lib/racialResources'
import { getMysticArcanumLevels } from '@/lib/spellcastingProgression'
import type { DerivedResource } from '@/lib/applySubclassEffects'
import { AbilitiesPanel } from '@/components/character-sheet/AbilitiesPanel'
import { SavingThrowsPanel } from '@/components/character-sheet/SavingThrowsPanel'
import { SkillsPanel } from '@/components/character-sheet/SkillsPanel'
import { TraitsFeaturesPanel } from '@/components/character-sheet/TraitsFeaturesPanel'
import { SpellsPanel } from '@/components/character-sheet/SpellsPanel'
import { PersonalityNotesPanel } from '@/components/character-sheet/PersonalityNotesPanel'
import { ResourcesPanel } from '@/components/character-sheet/ResourcesPanel'
import { getClassFeaturesAtLevel, getSubclassFeaturesAtLevel, formatActionType } from '@/lib/classFeatures'
import type { ClassKey, SubclassKey } from '@/lib/subclasses'
import { CLASS_DATA } from '@/lib/classes'
import { CombatStatsPanel } from '@/components/character-sheet/CombatStatsPanel'
import { EquipmentPanel } from '@/components/character-sheet/EquipmentPanel'
import { ActionsPanel } from '@/components/character-sheet/ActionsPanel'
import { ConditionsPanel } from '@/components/character-sheet/ConditionsPanel'

import { abilityMod } from '@/components/character-sheet/utils'
import { deriveStats } from '@/components/character-sheet/calc'
import { rollD20WithCrit, rollDamageWithCrit } from '@/lib/dice'
import { useCharacterRoll } from '@/hooks/useCharacterRoll'
import { levelForXp, xpForLevel } from '@/lib/rules'

import { canUseAction, type SheetAction } from '@/lib/actions'
import { setConditions } from '@/lib/conditionsSync'
import { ALL_ACTIONS } from '@/lib/actions/registry'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function normKey(v: any) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

// ✅ FIX: supports both `subclass` (new) and `subclass_key` (old/legacy)
function getSubclassKey(c: any) {
  return normKey(c?.subclass ?? c?.subclass_key)
}

function sneakDiceCount(level: number) {
  // 1d6 at 1, +1d6 every 2 levels
  return Math.floor((level + 1) / 2)
}

/**
 * ✅ Clears any "perRestFlag" locks (Action Surge, Second Wind, etc)
 * - Short rest clears only short-rest flags
 * - Long rest clears both short + long flags
 */
function clearPerRestFlags(prev: Record<string, any>, rest: 'short' | 'long') {
  const next: Record<string, any> = { ...(prev ?? {}) }

  for (const a of ALL_ACTIONS) {
    const cost: any = (a as any).cost
    if (!cost || cost.type !== 'perRestFlag') continue

    const flag = String(cost.flag ?? '').trim()
    const flagRest = cost.rest as 'short' | 'long' | undefined

    if (!flag || !flagRest) continue

    if (rest === 'short' && flagRest === 'short') {
      delete next[flag]
    }

    if (rest === 'long' && (flagRest === 'short' || flagRest === 'long')) {
      delete next[flag]
    }
  }

  return next
}

export default function CharacterSheetPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const [c, setC] = useState<CharacterSheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [homebrewSubclassFeatures, setHomebrewSubclassFeatures] = useState<any[] | null>(null)

  // Rename + delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Convert-to-CAYA (one-way) state
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)

  // CAYA level-up (click the gold XP bar) state
  const [startingLevelUp, setStartingLevelUp] = useState(false)

  // ✅ Attack crit tracking
  const [lastAttackWasCrit, setLastAttackWasCrit] = useState(false)

  // ✅ Persisted state
  const [resourceValues, setResourceValues] = useState<Record<string, number>>({})
  const [actionState, setActionState] = useState<Record<string, any>>({})
  const [sneakArmed, setSneakArmed] = useState(false)

  const saveTimer = useRef<any>(null)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .limit(1)
        .maybeSingle()

      if (error) console.error(error)
      setC(data as any)

      // hydrate persisted state
      const rs = (data as any)?.resource_state ?? {}
      const as = (data as any)?.action_state ?? {}
      setResourceValues(typeof rs === 'object' && rs ? rs : {})
      setActionState(typeof as === 'object' && as ? as : {})

      // If this character has a homebrew subclass, load its features so the
      // effect system (applySubclassToDerived) can apply them.
      const subclassKey = String((data as any)?.subclass ?? (data as any)?.subclass_key ?? '')
      if (subclassKey.startsWith('hb_sc_')) {
        const hbId = subclassKey.replace('hb_sc_', '')
        try {
          const { data: hbData } = await supabase
            .from('homebrew_subclasses')
            .select('features')
            .eq('id', hbId)
            .maybeSingle()
          setHomebrewSubclassFeatures((hbData as any)?.features ?? null)
        } catch {
          /* non-fatal — effects just won't apply */
        }
      }

      setLoading(false)
    })()
  }, [id])

  // Realtime: keep this character sheet in sync with damage applied to its
  // linked token via apply_combat_damage RPC (DMPanel HP buttons, MapBoard
  // HUD HP edit, attack-roll auto-apply, environmental triggers, etc.).
  // Mirror current_hp from the token row back into the local sheet state so
  // the sheet's HP bar updates without a manual refresh.
  useEffect(() => {
    if (!id) return
    const ch = supabase
      .channel(`character-linked-token-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tokens', filter: `character_id=eq.${id}` },
        (payload) => {
          const row: any = (payload as any).new
          if (!row) return
          const nextHp = row.current_hp
          if (typeof nextHp === 'number') {
            setC((prev) => (prev && prev.hit_points_current !== nextHp ? { ...prev, hit_points_current: nextHp } : prev))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id])

  // Persist & restore scroll position so reloading the sheet doesn't lose
  // the player's place (e.g. after editing a spell or scrolling deep into
  // resources). Keyed by character id in sessionStorage.
  useEffect(() => {
    if (!id || typeof window === 'undefined') return
    const scrollKey = `dnd721:char-scroll:${id}`
    // Restore on mount (defer one frame so layout has resolved).
    const saved = window.sessionStorage.getItem(scrollKey)
    if (saved) {
      const y = parseInt(saved, 10)
      if (Number.isFinite(y) && y > 0) {
        requestAnimationFrame(() => window.scrollTo(0, y))
      }
    }
    // Save on every scroll, but throttle by rAF so we don't thrash storage.
    let pending = false
    const onScroll = () => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        pending = false
        try { window.sessionStorage.setItem(scrollKey, String(window.scrollY)) } catch { /* quota */ }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [id])

  const abilities: Abilities = useMemo(
    () =>
      c?.abilities ?? {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
      },
    [c],
  )

  const savingThrowSet = useMemo(() => {
    // Wave AC3: prefer the stored saving_throw_profs column, but fall back to
    // CLASS_DATA[main_job].savingThrowProfs when the column is empty. Legacy
    // rows / partial migrations otherwise show every save as non-proficient.
    const raw = (c?.saving_throw_profs ?? []) as string[]
    if (raw.length > 0) return new Set(raw.map((v) => String(v).toLowerCase()))
    const ck = String((c as any)?.main_job ?? '').trim().toLowerCase() as keyof typeof CLASS_DATA
    const def = (CLASS_DATA as any)[ck]
    const fromClass = (def?.savingThrowProfs ?? []) as string[]
    return new Set(fromClass.map((v: string) => String(v).toLowerCase()))
  }, [c?.saving_throw_profs, (c as any)?.main_job])

  const d = useMemo(() => {
    if (!c) return null
    // Attach homebrew subclass features so applySubclassToDerived can use them
    const cWithHb = homebrewSubclassFeatures
      ? { ...c, _homebrew_subclass_features: homebrewSubclassFeatures }
      : c
    return deriveStats(cWithHb as any, abilities)
  }, [c, abilities, homebrewSubclassFeatures])

  // Wave AC1: debounced writeback of derived spell save DC / attack bonus into
  // the stored character columns so other consumers (PlayerSidebar target panel,
  // table HUDs, API exporters) see the up-to-date numbers without re-opening
  // the sheet. Only writes when the derived value actually differs from what's
  // already stored.
  const spellWritebackTimer = useRef<any>(null)
  useEffect(() => {
    if (!c?.id || !d) return
    if (loading) return
    const derivedDc  = d.spellSaveDc
    const derivedAtk = d.spellAttackBonus
    const storedDc   = (c as any).spell_save_dc
    const storedAtk  = (c as any).spell_attack_bonus
    if (derivedDc == null && derivedAtk == null) return
    if (derivedDc === storedDc && derivedAtk === storedAtk) return
    if (spellWritebackTimer.current) clearTimeout(spellWritebackTimer.current)
    spellWritebackTimer.current = setTimeout(async () => {
      try {
        await supabase
          .from('characters')
          .update({
            spell_save_dc:      derivedDc,
            spell_attack_bonus: derivedAtk,
          })
          .eq('id', c.id)
        setC((prev) => prev ? { ...prev, spell_save_dc: derivedDc, spell_attack_bonus: derivedAtk } : prev)
      } catch (e) {
        console.error('[char-sheet] spell DC/attack writeback failed', e)
      }
    }, 1000)
    return () => { if (spellWritebackTimer.current) clearTimeout(spellWritebackTimer.current) }
  }, [c?.id, d?.spellSaveDc, d?.spellAttackBonus, c?.spell_save_dc, c?.spell_attack_bonus, loading])

  // Ensure resourceValues contains keys for derived resources (and clamp)
  useEffect(() => {
    if (!d) return
    setResourceValues((prev) => {
      const next = { ...prev }
      for (const r of d.resources ?? []) {
        const fallback = r.current ?? r.max
        const v = typeof next[r.key] === 'number' ? next[r.key] : fallback
        next[r.key] = clamp(v, 0, r.max)
      }
      return next
    })
  }, [d])

  // ✅ Debounced Supabase persistence for resource_state + action_state
  useEffect(() => {
    if (!c) return
    if (loading) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await supabase
          .from('characters')
          .update({
            resource_state: resourceValues,
            action_state: actionState,
          })
          .eq('id', c.id)
      } catch (e) {
        console.error('Failed to persist sheet state', e)
      }
    }, 500)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [resourceValues, actionState, c, loading])

  const { roll: charRoll } = useCharacterRoll({
    characterId: c?.id ?? null,
    rollerName: c?.name ?? 'Adventurer',
  })

  type ActiveTab = 'overview' | 'skills_traits' | 'gear' | 'magic' | 'notes'
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    // Wave AC5: restore last-selected tab from sessionStorage so reloads don't
    // throw the player back to Overview. Keyed by character id.
    if (typeof window === 'undefined') return 'overview'
    try {
      const saved = window.sessionStorage.getItem(`dnd721:char-tab:${id}`) as ActiveTab | null
      if (saved && ['overview', 'skills_traits', 'gear', 'magic', 'notes'].includes(saved)) return saved
    } catch { /* ignore */ }
    return 'overview'
  })
  useEffect(() => {
    if (!id || typeof window === 'undefined') return
    try { window.sessionStorage.setItem(`dnd721:char-tab:${id}`, activeTab) } catch { /* ignore */ }
  }, [id, activeTab])

  // ✅ Local temp HP (mirrors DB; update written immediately)
  const [tempHp, setTempHpLocal] = useState<number>(0)
  useEffect(() => {
    if (c) setTempHpLocal(Number(c.temp_hp ?? 0))
  }, [c])

  async function onSetTempHp(val: number) {
    const next = Math.max(0, val)
    setTempHpLocal(next)
    if (!c?.id) return
    await supabase.from('characters').update({ temp_hp: next }).eq('id', c.id)
    setC((prev) => prev ? { ...prev, temp_hp: next } : prev)
  }

  async function onAdjustHp(delta: number) {
    if (!c?.id || !d) return
    let effectiveDelta = delta
    let nextTempHp = tempHp
    // Absorb damage into temp HP first
    if (delta < 0 && nextTempHp > 0) {
      const absorbed = Math.min(nextTempHp, -delta)
      nextTempHp -= absorbed
      effectiveDelta += absorbed
      setTempHpLocal(nextTempHp)
      await supabase.from('characters').update({ temp_hp: nextTempHp }).eq('id', c.id)
    }
    const current = Number(c.hit_points_current ?? d.hpMax)
    const next = clamp(current + effectiveDelta, 0, d.hpMax)
    setC((prev) => prev ? { ...prev, hit_points_current: next, temp_hp: nextTempHp } : prev)

    // Wave AC4: route through the apply_combat_damage RPC when this character
    // has a linked token. The RPC syncs token + character HP atomically and
    // fires the realtime updates the DM panel + initiative tracker + canvas
    // are listening for. Falls back to a direct character row write when no
    // token is linked (e.g. character not yet placed on a map).
    try {
      const { data: tok } = await supabase
        .from('tokens')
        .select('id')
        .eq('character_id', c.id)
        .limit(1)
        .maybeSingle()
      const tokenId = (tok as any)?.id ?? null
      if (tokenId) {
        // RPC takes positive damage; positive delta in this UI = heal, so flip.
        const { error } = await supabase.rpc('apply_combat_damage', {
          p_token_id: tokenId,
          p_amount: -effectiveDelta,
        })
        if (error) {
          console.error('[char-sheet] onAdjustHp RPC error', error)
          // Fall back to a direct char row write so the sheet still persists.
          await supabase.from('characters').update({ hit_points_current: next }).eq('id', c.id)
        }
        return
      }
    } catch (e) {
      console.error('[char-sheet] onAdjustHp token lookup failed', e)
    }
    await supabase.from('characters').update({ hit_points_current: next }).eq('id', c.id)
  }

  function rollAbilityCheck(abilityKey: string | number | symbol) {
    if (!c) return
    const k = String(abilityKey).toLowerCase() as keyof Abilities
    if (!(k in abilities)) return
    const mod = abilityMod(abilities[k])
    charRoll({ label: `${String(k).toUpperCase()} check`, formula: `1d20+${mod}`, rollType: 'ability_check' })
  }

  function rollSavingThrow(abilityKey: string | number | symbol) {
    if (!c || !d) return
    const k = String(abilityKey).toLowerCase() as keyof Abilities
    if (!(k in abilities)) return
    const base = abilityMod(abilities[k])
    const hasProf = savingThrowSet.has(String(k).toLowerCase())
    const mod = base + (hasProf ? d.profBonus : 0)
    charRoll({ label: `${String(k).toUpperCase()} save`, formula: `1d20+${mod}`, rollType: 'save' })
  }

  function rollMainAttack() {
    if (!d) return

    const critRange = (d as any).critRange ?? 20
    const r = rollD20WithCrit(d.attackFormula, critRange)
    setLastAttackWasCrit(Boolean(r.isCrit))

    const label = r.isCrit
      ? `CRIT Attack — ${d.weaponName ?? 'Unarmed'}`
      : `Attack — ${d.weaponName ?? 'Unarmed'}`
    charRoll({ label, formula: d.attackFormula, rollType: 'attack' })
  }

  function rollMainDamage() {
    if (!d || !c) return

    // base weapon damage (already handles crit dice doubling)
    const base = rollDamageWithCrit(d.damageFormula, lastAttackWasCrit)
    let total = base.total
    let formula = base.formula

    const classKey = normKey(c.main_job)

    // ✅ Auto-add Sneak Attack if armed and not used this turn
    if (classKey === 'rogue' && sneakArmed && !Boolean(actionState.sneak_used_turn)) {
      const dice = sneakDiceCount(Number(c.level ?? 1))
      const sneakFormula = `${dice}d6`

      const sneak = rollDamageWithCrit(sneakFormula, lastAttackWasCrit)
      total += sneak.total
      // Combine into one MIXED roll (e.g. "1d8+3 + 2d6") so it logs/animates as a
      // single weapon + sneak hit rather than two separate rolls.
      formula = `${base.formula} + ${sneak.formula}`

      // mark used + disarm
      setActionState((prev) => ({ ...prev, sneak_used_turn: true }))
      setSneakArmed(false)
    }

    const label = lastAttackWasCrit
      ? `CRIT Damage — ${d.weaponName ?? 'Unarmed'}`
      : `Damage — ${d.weaponName ?? 'Unarmed'}`
    charRoll({ label, formula, rollType: 'damage' })

    // reset crit once spent
    setLastAttackWasCrit(false)
  }

  function onChangeResource(key: string, next: number) {
    if (!d) return
    const r = d.resources.find((x) => x.key === key)
    if (!r) return
    setResourceValues((prev) => ({ ...prev, [key]: clamp(next, 0, r.max) }))
  }

  function onToggleCondition(key: string) {
    setActionState((prev) => {
      const cur: string[] = Array.isArray(prev?.active_conditions) ? prev.active_conditions : []
      const next = cur.includes(key) ? cur.filter((c) => c !== key) : [...cur, key]
      // Mirror to the token store (map rings / initiative pips / DM panels) via the
      // canonical RPC; the debounced action_state save handles enforcement persistence.
      void setConditions(supabase, { characterId: id, conditions: next })
      return { ...prev, active_conditions: next }
    })
  }

  // ✅ Spell slot tracking — stored in resourceValues as spell_slot_used_1, etc.
  function onSpendSlot(level: string) {
    if (!c?.spell_slots) return
    const max = Number(c.spell_slots[level] ?? 0)
    setResourceValues((prev) => {
      const key = `spell_slot_used_${level}`
      const cur = Number(prev[key] ?? 0)
      return { ...prev, [key]: Math.min(max, cur + 1) }
    })
  }

  function onRestoreSlot(level: string) {
    setResourceValues((prev) => {
      const key = `spell_slot_used_${level}`
      const cur = Number(prev[key] ?? 0)
      return { ...prev, [key]: Math.max(0, cur - 1) }
    })
  }

  const isWarlock = normKey(c?.main_job) === 'warlock'

  function onShortRest() {
    if (!d) return

    // refill resources that recharge on short rest
    setResourceValues((prev) => {
      const next = { ...prev }
      for (const r of d.resources ?? []) {
        if (r.recharge === 'short_rest') next[r.key] = r.max
      }
      // Warlock spell slots recharge on short rest
      if (isWarlock && c?.spell_slots) {
        for (const lvl of Object.keys(c.spell_slots)) {
          delete next[`spell_slot_used_${lvl}`]
        }
      }
      // Polish 1: zero racial innate _used counts for short-rest recharges.
      const racialShort = getRacialResources(c?.race ?? null, Number(c?.level ?? 1))
        .filter(r => r.recharge === 'short_rest')
      for (const r of racialShort) next[r.key] = 0
      return next
    })

    // ✅ clear "once per short rest" locks (Action Surge, Second Wind, etc)
    setActionState((prev) => clearPerRestFlags(prev, 'short'))
  }

  function onLongRest() {
    if (!d) return

    // refill resources that recharge on short or long rest + restore all spell slots
    setResourceValues((prev) => {
      const next = { ...prev }
      for (const r of d.resources ?? []) {
        if (r.recharge === 'short_rest' || r.recharge === 'long_rest') next[r.key] = r.max
      }
      // Restore all spell slots on long rest
      if (c?.spell_slots) {
        for (const lvl of Object.keys(c.spell_slots)) {
          delete next[`spell_slot_used_${lvl}`]
        }
      }
      // Polish 1: zero ALL racial innate _used counts (both short/long recharge)
      // and zero Mystic Arcanum uses.
      for (const key of Object.keys(next)) {
        if (key.startsWith('racial_') && key.endsWith('_used')) next[key] = 0
        if (key.startsWith('mystic_arcanum_used_')) next[key] = 0
      }
      return next
    })

    // ✅ clear per-rest locks (short + long) on long rest
    setActionState((prev) => {
      const cleared = clearPerRestFlags(prev, 'long')
      // also reset per-turn action flags on long rest
      delete cleared.sneak_used_turn
      return cleared
    })

    setSneakArmed(false)
  }

  function executeEffects(action: SheetAction) {
    if (!action.effects?.length) return
    for (const effect of action.effects) {
      switch (effect.type) {
        case 'setFlag':
          setActionState((prev) => ({ ...(prev ?? {}), [effect.flag]: effect.value }))
          break
        case 'rollFormula':
          charRoll({ label: effect.label || action.name, formula: effect.formula, rollType: 'sheet' })
          break
        case 'rollAttack':
          rollMainAttack()
          break
        case 'rollDamage':
          rollMainDamage()
          break
        case 'logNote':
          // logNote is purely informational — no dice roll, skip
          break
      }
    }
  }

  // ✅ FIXED: Use actions from registry (class/subclass/dnd721) — TS-safe narrowing
  async function handleUseAction(action: SheetAction) {
    if (!c?.id) return

    const classKey = normKey(c.main_job)
    const subclassKey = getSubclassKey(c as any)

    const status = canUseAction({
      action,
      classKey,
      subclassKey,
      actionState,
      resourceState: resourceValues,
    })

    if (!status.ok) return

    const cost = action.cost

    switch (cost.type) {
      case 'none':
        break

      case 'perTurnFlag':
        setActionState((prev) => ({ ...(prev ?? {}), [cost.flag]: true }))
        break

      case 'perRestFlag':
        setActionState((prev) => ({ ...(prev ?? {}), [cost.flag]: true }))
        break

      case 'resource': {
        const key = cost.key
        const have = Number(resourceValues?.[key] ?? 0)
        const nextVal = Math.max(0, have - cost.amount)
        setResourceValues((prev) => ({ ...(prev ?? {}), [key]: nextVal }))
        break
      }
    }

    executeEffects(action)
  }

  // ── Rename ──────────────────────────────────────────────────────────────────
  async function handleRename(newName: string) {
    if (!c) return
    setC((prev) => prev ? { ...prev, name: newName } : prev)
    await supabase.from('characters').update({ name: newName }).eq('id', c.id)
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!c) return
    const wallet = (typeof window !== 'undefined' ? localStorage.getItem('dnd721_wallet') : '') ?? ''
    const res = await fetch(`/api/characters/${c.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    })
    if (res.ok) {
      try {
        const profRes = await fetch(`/api/profiles/by-wallet?wallet=${encodeURIComponent(wallet)}`)
        const profBody = await profRes.json().catch(() => ({}))
        const username = profBody?.profile?.username
        router.push(username ? `/profile/${encodeURIComponent(username)}` : '/characters')
      } catch {
        router.push('/characters')
      }
    } else {
      const body = await res.json().catch(() => ({}))
      console.error('Delete failed', body)
    }
  }

  // ── Convert to CAYA (one-way; resets to level 1) ──────────────────────────────
  async function handleConvertToCaya() {
    if (!c) return
    setConverting(true)
    setConvertError(null)
    const wallet = (typeof window !== 'undefined' ? localStorage.getItem('dnd721_wallet') : '') ?? ''
    try {
      const res = await fetch(`/api/characters/${c.id}/convert-caya`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setConvertError(body?.error ?? 'Conversion failed')
        setConverting(false)
        return
      }
      // Full reload so every derived stat (level, slots, HP, XP bar) re-derives cleanly.
      window.location.reload()
    } catch (e: any) {
      setConvertError(e?.message ?? 'Network error')
      setConverting(false)
    }
  }

  // Re-fetch the character after a level-up step (class pick or ASI) so level,
  // HP, slots, abilities, feats, and any remaining pending choice all refresh.
  async function refetchCharacter() {
    const { data } = await supabase
      .from('characters')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle()
    if (data) {
      setC(data as any)
      const rs = (data as any)?.resource_state ?? {}
      const as = (data as any)?.action_state ?? {}
      setResourceValues(typeof rs === 'object' && rs ? rs : {})
      setActionState(typeof as === 'object' && as ? as : {})
    }
  }

  // ── Start a level-up from the gold XP bar ─────────────────────────────────────
  // Sets the pending class-pick choice (the same flag award-xp sets), which makes
  // the already-rendered MulticlassLevelUpModal appear. The modal → take-class-level
  // applies one level at a time (recomputing HP/slots/DC/subclass spells) and keeps
  // prompting until the whole XP gap (to_level) is assigned.
  async function handleStartLevelUp(fromLevel: number, toLevel: number) {
    if (!c || startingLevelUp) return
    setStartingLevelUp(true)
    try {
      const nextActionState = {
        ...actionState,
        pending_choices: {
          ...((actionState as any)?.pending_choices ?? {}),
          levelup_class_pick: {
            from_level: fromLevel,
            to_level: toLevel,
            created_at: new Date().toISOString(),
          },
        },
      }
      // Persist (owner RLS allows the player's own character) and reflect locally so
      // the modal (which reads c.action_state) shows immediately.
      await supabase.from('characters').update({ action_state: nextActionState }).eq('id', id)
      setActionState(nextActionState)
      setC((prev) => (prev ? ({ ...prev, action_state: nextActionState } as any) : prev))
    } catch (e) {
      console.error('[level-up] failed to open level-up', e)
    } finally {
      setStartingLevelUp(false)
    }
  }

  if (loading) return <div className="p-4 text-slate-300">Loading character...</div>
  if (!c || !d) return <div className="p-4 text-red-300">Character not found.</div>

  const isMageUser = Boolean(c.spellcasting_ability)

  const isCaya = Boolean((c as any)?.is_caya)
  const xp = isCaya ? ((c as any)?.experience_points ?? 0) : 0
  const earnedLevel = isCaya ? levelForXp(xp) : null
  const currentLevel = c.level ?? 1
  const xpForCurrentLevel = isCaya ? xpForLevel(currentLevel) : 0
  const xpForNextLevel = isCaya ? xpForLevel(Math.min(20, currentLevel + 1)) : 0
  const xpPct = isCaya && currentLevel < 20
    ? Math.min(100, Math.round(((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100))
    : 100

  // Level-up readiness: enough XP for a higher level. `levelUpPending` is true once
  // the class-pick modal has been opened (don't flash the bar while it's showing).
  const canLevelUp = isCaya && earnedLevel !== null && earnedLevel > currentLevel
  const levelUpPending = Boolean(
    (c.action_state as any)?.pending_choices?.levelup_class_pick ||
    (c.action_state as any)?.pending_choices?.levelup_asi ||
    (c.action_state as any)?.pending_choices?.levelup_subclass,
  )

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-3 pb-16 md:px-6">
      <CharacterHeader c={c} d={d} onRename={handleRename} onDelete={() => setShowDeleteModal(true)} />

      {/* Level-up choices resolve in order: subclass (L3) → ASI/feat → class pick. */}
      {(() => {
        const pc = (c.action_state as any)?.pending_choices ?? {}
        const subclassPending = Boolean(pc.levelup_subclass)
        const asiPending = Boolean(pc.levelup_asi)
        return (
          <>
            <LevelUpSubclassModal c={c} onApplied={refetchCharacter} />
            {!subclassPending && <LevelUpAsiModal c={c} onApplied={refetchCharacter} />}
            {!subclassPending && !asiPending && (
              <MulticlassLevelUpModal c={c} onApplied={refetchCharacter} />
            )}
          </>
        )
      })()}

      {/* Level-up banner */}
      {isCaya && earnedLevel !== null && earnedLevel > currentLevel && (() => {
        const classKey = normKey(c.main_job) as ClassKey
        const subclassKey = (c.subclass ? normKey(c.subclass) : null) as SubclassKey | null
        const newClassFeatures = getClassFeaturesAtLevel(classKey, earnedLevel)
        const newSubFeatures = subclassKey ? getSubclassFeaturesAtLevel(subclassKey, earnedLevel) : []
        const newFeatures = [...newClassFeatures, ...newSubFeatures]
        return (
          <div className="rounded-lg border border-amber-500 bg-amber-950/40 px-4 py-3 text-sm text-amber-200 space-y-2">
            <div>
              <span className="font-bold text-amber-300">Level Up!</span> You&apos;ve earned enough XP to reach level {earnedLevel}.
              Click the gold XP bar below to level up.
            </div>
            {newFeatures.length > 0 && (
              <div className="rounded border border-amber-700/40 bg-amber-950/30 p-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                  Features You Gain at Level {earnedLevel}
                </div>
                <ul className="space-y-1.5">
                  {newFeatures.map((f) => (
                    <li key={f.id} className="text-[11px] leading-snug text-amber-100">
                      <span className="font-semibold text-amber-200">{f.name}</span>
                      <span className="ml-1.5 rounded bg-sky-900/40 border border-sky-700/40 px-1 py-0.5 text-[9px] font-semibold uppercase text-sky-200">
                        {formatActionType(f.type)}
                      </span>
                      <div className="mt-0.5 text-[10px] text-amber-100/80">{f.shortDescription}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })()}

      {/* XP progress bar (CAYA only) */}
      {isCaya && canLevelUp && !levelUpPending ? (
        // Ready to level up — solid gold, flashing, clickable.
        <button
          type="button"
          onClick={() => handleStartLevelUp(currentLevel, earnedLevel!)}
          disabled={startingLevelUp}
          className="w-full rounded-xl border-2 border-amber-400 bg-amber-950/40 px-4 py-3 text-left ring-2 ring-amber-400/60 transition hover:bg-amber-900/40 disabled:opacity-60 animate-pulse"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-200">⬆ Click to Level Up!</span>
            <span className="font-semibold text-amber-200">
              Level {currentLevel} → {earnedLevel}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full rounded-full bg-amber-900/50 overflow-hidden">
            <div
              className="h-full w-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }}
            />
          </div>
          <p className="mt-1 text-[10px] text-amber-300/80">
            {startingLevelUp ? 'Opening level-up…' : `${xp.toLocaleString()} XP — choose your class to level up`}
          </p>
        </button>
      ) : isCaya ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-300">CAYA — Experience Points</span>
            <span className="text-slate-400">
              {currentLevel < 20
                ? `${xp.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`
                : `${xp.toLocaleString()} XP — Max Level`}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${xpPct}%`,
                background: 'linear-gradient(90deg, #d97706, #f59e0b)',
              }}
            />
          </div>
          <p className="text-[10px] text-slate-500">
            {levelUpPending
              ? 'Leveling up — finish your choices above ⬆'
              : `Level ${currentLevel}${currentLevel < 20 ? ` → ${currentLevel + 1}` : ' (max)'}`}
          </p>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
        {(['overview', 'skills_traits', 'gear', 'notes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === t
                ? 'bg-indigo-600/30 text-indigo-100 ring-1 ring-indigo-500/50'
                : 'bg-slate-900/40 text-slate-300 hover:bg-slate-900'
            }`}
          >
            {t === 'overview'
              ? 'Overview'
              : t === 'skills_traits'
                ? 'Skills & Traits'
                : t === 'gear'
                  ? 'Gear'
                  : 'Notes'}
          </button>
        ))}

        {isMageUser && (
          <button
            onClick={() => setActiveTab('magic')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'magic'
                ? 'bg-indigo-600/30 text-indigo-100 ring-1 ring-indigo-500/50'
                : 'bg-slate-900/40 text-slate-300 hover:bg-slate-900'
            }`}
          >
            Spellbook
          </button>
        )}

        {!isMageUser && (
          <div className="ml-auto flex items-center text-[10px] text-slate-500">
            Spellbook hidden (non-mage)
          </div>
        )}
      </div>

      <div className="grid gap-4 items-start md:grid-cols-[1.4fr,2fr]">
        {/* LEFT COLUMN — always visible core stats */}
        <div className="space-y-3">
          <AbilitiesPanel abilities={abilities} onRollAbilityCheck={rollAbilityCheck} />
          <CombatStatsPanel
            d={d}
            tempHp={tempHp}
            onAttack={rollMainAttack}
            onDamage={rollMainDamage}
            onAdjustHp={onAdjustHp}
            onSetTempHp={onSetTempHp}
            // Wave AC5: surface concentration + death saves from action_state.
            concentratingOn={(actionState as any)?.concentration_active ? ((actionState as any)?.concentration_on ?? 'a spell') : null}
            onEndConcentration={async () => {
              setActionState((prev) => ({ ...(prev ?? {}), concentration_active: false, concentration_on: null }))
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('dnd721-concentration-broken', { detail: { wallet: c?.wallet_address?.toLowerCase() } }))
              }
            }}
            deathSaves={((actionState as any)?.death_saves ?? null) as { s: number; f: number } | null}
            onAdjustDeathSave={(kind, delta) => {
              setActionState((prev: any) => {
                const cur = (prev?.death_saves ?? { s: 0, f: 0 }) as { s: number; f: number }
                const next = { ...cur, [kind]: clamp(cur[kind] + delta, 0, 3) }
                return { ...(prev ?? {}), death_saves: next }
              })
            }}
          />
          <SavingThrowsPanel
            abilities={abilities}
            savingThrowSet={savingThrowSet}
            profBonus={d.profBonus}
            onRollSavingThrow={rollSavingThrow}
            storedProfsEmpty={(c?.saving_throw_profs ?? []).length === 0}
            onSyncFromClass={async () => {
              if (!c?.id) return
              const profs = Array.from(savingThrowSet)
              try {
                await supabase.from('characters').update({ saving_throw_profs: profs }).eq('id', c.id)
                setC((prev) => prev ? { ...prev, saving_throw_profs: profs as any } : prev)
              } catch (e) {
                console.error('[char-sheet] sync saving_throw_profs failed', e)
              }
            }}
          />
        </div>

        {/* MIDDLE COLUMN — tab-specific content */}
        <div className="space-y-3">
          {activeTab === 'overview' && (
            <>
              <ConditionsPanel
                activeConditions={Array.isArray(actionState?.active_conditions) ? actionState.active_conditions : []}
                onToggleCondition={onToggleCondition}
                exhaustionLevel={Number(actionState?.exhaustion_level ?? 0)}
                onExhaustionChange={(level) => {
                  setActionState((prev) => ({ ...prev, exhaustion_level: level }))
                }}
              />
              <ActionsPanel
                classKey={normKey(c.main_job)}
                subclassKey={getSubclassKey(c as any)}
                actionState={actionState}
                resourceState={resourceValues}
                onUseAction={handleUseAction}
                sneakArmed={sneakArmed}
                onToggleSneakArm={() => setSneakArmed((prev) => !prev)}
              />
              <ResourcesPanel
                resources={(() => {
                  // Polish 1 + 2: merge racial innates AND Mystic Arcanum into
                  // the ResourcesPanel list so players can track everything
                  // from the sheet.
                  const base = d.resources ?? []
                  const racial = getRacialResources(c.race ?? null, Number(c.level ?? 1))
                  const racialDerived: DerivedResource[] = racial.map(r => ({
                    key: r.key,
                    name: `${r.name} (Racial)`,
                    max: r.max,
                    current: Math.max(0, r.max - Number(resourceValues[r.key] ?? 0)),
                    recharge: r.recharge,
                    note: `Racial innate · ${r.recharge.replace('_', ' ')} recharge`,
                  }))
                  // Mystic Arcanum picks (Warlock 11+)
                  const arcanumLevels = getMysticArcanumLevels(c.main_job, Number(c.level ?? 1))
                  const picks = ((c as any).mystic_arcanum ?? {}) as Record<string, string | null>
                  const arcanumDerived: DerivedResource[] = arcanumLevels
                    .filter(lvl => !!picks[String(lvl)])
                    .map(lvl => {
                      const key = `mystic_arcanum_used_${lvl}`
                      const used = Number(resourceValues[key] ?? 0)
                      return {
                        key,
                        name: `${picks[String(lvl)]} (Mystic Arcanum L${lvl})`,
                        max: 1,
                        current: Math.max(0, 1 - used),
                        recharge: 'long_rest',
                        note: '1/day — bypasses pact slots',
                      }
                    })
                  return [...base, ...racialDerived, ...arcanumDerived]
                })()}
                // Polish 1 + 2: racial + arcanum keys store USED counts (per
                // dashboard semantics), but ResourcesPanel displays AVAILABLE.
                // Translate both directions.
                values={(() => {
                  const racial = getRacialResources(c.race ?? null, Number(c.level ?? 1))
                  const arcanumLevels = getMysticArcanumLevels(c.main_job, Number(c.level ?? 1))
                  if (racial.length === 0 && arcanumLevels.length === 0) return resourceValues
                  const out = { ...resourceValues }
                  for (const r of racial) {
                    const used = Number(resourceValues[r.key] ?? 0)
                    out[r.key] = Math.max(0, r.max - used)
                  }
                  for (const lvl of arcanumLevels) {
                    const key = `mystic_arcanum_used_${lvl}`
                    out[key] = Math.max(0, 1 - Number(resourceValues[key] ?? 0))
                  }
                  return out
                })()}
                onChange={(key, next) => {
                  // Translate racial available → used count for storage.
                  if (key.startsWith('racial_') && key.endsWith('_used')) {
                    const racial = getRacialResources(c.race ?? null, Number(c.level ?? 1))
                      .find(r => r.key === key)
                    if (racial) {
                      const newUsed = Math.max(0, Math.min(racial.max, racial.max - next))
                      setResourceValues(prev => ({ ...prev, [key]: newUsed }))
                      return
                    }
                  }
                  // Mystic Arcanum: same translation (max = 1).
                  if (key.startsWith('mystic_arcanum_used_')) {
                    const newUsed = Math.max(0, Math.min(1, 1 - next))
                    setResourceValues(prev => ({ ...prev, [key]: newUsed }))
                    return
                  }
                  onChangeResource(key, next)
                }}
                onShortRest={onShortRest}
                onLongRest={onLongRest}
                conMod={abilityMod(abilities.con)}
                onRoll={({ label, formula }) => charRoll({ label, formula, rollType: 'sheet' })}
                currentHp={Number(c.hit_points_current ?? d.hpMax)}
                maxHp={d.hpMax}
                onHpChange={(newHp) => {
                  setC((prev) => prev ? { ...prev, hit_points_current: newHp } : prev)
                  supabase.from('characters').update({ hit_points_current: newHp }).eq('id', c.id)
                }}
              />
            </>
          )}

          {activeTab === 'skills_traits' && (
            <>
              <SkillsPanel
                c={c}
                abilities={abilities}
                profBonus={d.profBonus}
                passivePerception={d.passivePerception}
              />
              <div className="max-h-[60vh] overflow-y-auto rounded-xl">
                <TraitsFeaturesPanel c={c} />
              </div>
            </>
          )}

          {activeTab === 'gear' && (
            <EquipmentPanel
              c={c}
              onSaved={(patch) => setC((prev) => (prev ? ({ ...prev, ...patch } as any) : prev))}
            />
          )}

          {activeTab === 'notes' && <PersonalityNotesPanel c={c} />}

          {activeTab === 'magic' && isMageUser && (
            <>
              <SpellsPanel
                c={c}
                spellSlots={c.spell_slots ?? null}
                slotUsed={resourceValues}
                onSpendSlot={onSpendSlot}
                onRestoreSlot={onRestoreSlot}
                // Wave AC1: pass live-derived spell DC/attack so the panel can
                // show the up-to-date numbers even before the stored columns
                // are re-saved.
                derivedSpellSaveDc={d?.spellSaveDc ?? null}
                derivedSpellAttackBonus={d?.spellAttackBonus ?? null}
              />
              {/* Polish 3: Warlock invocations panel — auto-hides for non-Warlocks. */}
              <WarlockInvocationsPanel c={c} />
            </>
          )}
        </div>

      </div>

      {/* ── Game Type / Convert to CAYA ────────────────────────────────────── */}
      <div className="mx-auto mt-6 max-w-3xl px-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <h3 className="text-sm font-semibold text-slate-200">Game Type</h3>
          {isCaya ? (
            <p className="mt-1 text-xs text-amber-300">
              <span className="rounded border border-amber-600/40 bg-amber-600/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">CAYA</span>{' '}
              Come As You Are — this character levels up by earning XP in play.
            </p>
          ) : (
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                Free-Level character. Convert to CAYA to play in Come-As-You-Are games — this
                resets the character to level 1 and <span className="font-semibold text-amber-300">cannot be undone</span>.
              </p>
              <button
                onClick={() => { setConvertError(null); setShowConvertModal(true) }}
                className="shrink-0 rounded-lg border border-amber-700/50 bg-amber-600/20 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-600/30"
              >
                Convert to CAYA
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Convert-to-CAYA confirmation modal ─────────────────────────────── */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-80 space-y-4 rounded-xl border border-slate-600 bg-slate-800 p-6 text-white shadow-2xl">
            <h2 className="text-lg font-bold text-amber-400">Convert to CAYA?</h2>
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">{c?.name ?? 'This character'}</span> will be reset to{' '}
              <span className="font-semibold">level 1</span> with 0 XP, and any multiclass will be dropped.
              CAYA characters level up by earning XP in play.{' '}
              <span className="font-semibold text-amber-300">This cannot be undone.</span>
            </p>
            {convertError && <p className="text-xs text-red-400">{convertError}</p>}
            <div className="flex justify-end gap-3">
              <button
                disabled={converting}
                onClick={() => setShowConvertModal(false)}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm transition-colors hover:bg-slate-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={converting}
                onClick={handleConvertToCaya}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-amber-500 disabled:opacity-50"
              >
                {converting ? 'Converting…' : 'Convert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ──────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-80 text-white space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-red-400">Delete Character?</h2>
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">{c?.name ?? 'This character'}</span> will be permanently
              deleted and cannot be recovered.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 rounded-lg font-semibold transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
