'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

type RollType =
  | 'attack'
  | 'skill'
  | 'save'
  | 'damage'
  | 'initiative'
  | 'ability_check'
  | 'sheet'
  | 'custom'

export type CharRollParams = {
  label: string
  formula: string
  rollType?: RollType
}

export type CharRollResult = {
  total: number
  /** Normalised formula sent to the API (e.g. "1d20-2" not "1d20+-2") */
  formula: string
  label: string
  individualDice: { die: string; value: number }[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SESSION_CACHE_MS = 30 * 60 * 1000 // 30 min

/** CSPRNG die roll — avoids Math.random() */
function rollDieClient(sides: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % sides) + 1
}

/** Parse "2d6+3" → { count, sides, mod } */
function parseFormula(f: string): { count: number; sides: number; mod: number } | null {
  const m = f.trim().match(/^(\d+)[dD](\d+)\s*([+-]\d+)?$/)
  if (!m) return null
  const count = parseInt(m[1], 10)
  const sides = parseInt(m[2], 10)
  const mod = m[3] ? parseInt(m[3], 10) : 0
  if (count < 1 || count > 20 || sides < 2 || sides > 100) return null
  return { count, sides, mod }
}

/**
 * Normalise formula before sending to the API:
 *   "1d20+-2"  → "1d20-2"
 *   "1d20+0"   → "1d20"
 *   "d6+3"     → "1d6+3"  (implicit 1 not needed — API regex requires \d+)
 */
function normalizeFormula(f: string): string {
  return f
    .trim()
    .replace(/\+(-\d+)/, '$1') // +-N  → -N
    .replace(/\+0$/, '')        // +0   → (remove)
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Character-sheet roll hook.
 *
 * - Detects whether this character is in an active session (status = 'in_progress').
 * - Caches the session_id for 30 minutes to avoid round-trips on every roll.
 * - Rolls locally (CSPRNG) for instant UI feedback.
 * - Fire-and-forgets a POST to /api/roll with `prerolledTotal` so the
 *   session dice log shows exactly the same number the player saw.
 */
export function useCharacterRoll(params: {
  characterId: string | undefined | null
  rollerName: string
}) {
  const { characterId, rollerName } = params

  // Stable refs — updated on every render but always point to latest value
  const characterIdRef = useRef(characterId)
  const rollerNameRef = useRef(rollerName)
  useEffect(() => { characterIdRef.current = characterId }, [characterId])
  useEffect(() => { rollerNameRef.current = rollerName }, [rollerName])

  const sessionCacheRef = useRef<{ id: string; expiry: number } | null>(null)
  const fetchingRef = useRef(false)

  // Pre-fetch the active session eagerly on mount / when characterId changes
  useEffect(() => {
    if (characterId) void fetchSession(characterId)
  }, [characterId])

  // ── Session fetch ────────────────────────────────────────────────────────

  async function fetchSession(cid: string): Promise<string | null> {
    const cache = sessionCacheRef.current
    if (cache && Date.now() < cache.expiry) return cache.id

    // Prevent concurrent fetches
    if (fetchingRef.current) return sessionCacheRef.current?.id ?? null
    fetchingRef.current = true

    try {
      // Look for a session_players row linking this character to an in-progress session
      const { data } = await supabase
        .from('session_players')
        .select('session_id, sessions!inner(status)')
        .eq('character_id', cid)
        .eq('sessions.status', 'in_progress')
        .limit(1)
        .maybeSingle()

      const id = (data as any)?.session_id ?? null
      sessionCacheRef.current = id ? { id, expiry: Date.now() + SESSION_CACHE_MS } : null
      return id
    } catch {
      return null
    } finally {
      fetchingRef.current = false
    }
  }

  // ── Roll function ────────────────────────────────────────────────────────

  /**
   * Roll locally and—if an active session exists—persist to the session dice log.
   * Returns the result immediately (synchronous for the caller).
   */
  function roll({ label, formula, rollType = 'sheet' }: CharRollParams): CharRollResult {
    const normalized = normalizeFormula(formula)
    const parsed = parseFormula(normalized)

    let total = 0
    const individualDice: { die: string; value: number }[] = []

    if (parsed) {
      const rolls = Array.from({ length: parsed.count }, () => rollDieClient(parsed.sides))
      rolls.forEach((v) => individualDice.push({ die: `d${parsed.sides}`, value: v }))
      total = rolls.reduce((a, b) => a + b, 0) + parsed.mod
    }

    // Fire-and-forget: persist to session dice log when a session is active
    const cid = characterIdRef.current
    const rName = rollerNameRef.current
    if (cid && parsed) {
      void fetchSession(cid).then((sessionId) => {
        if (!sessionId) return
        fetch('/api/roll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notation: normalized,
            sessionId,
            rollType,
            label,
            rollerName: rName,
            characterId: cid,
            prerolledTotal: total,
          }),
        }).catch(() => {
          // Network errors are silently swallowed — the local result already showed
        })
      })
    }

    return { total, formula: normalized, label, individualDice }
  }

  return { roll }
}
