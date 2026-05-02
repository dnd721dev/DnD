// src/lib/shopPricing.ts
// Pricing utilities for the DND721 shop.
// Works in both Node.js (API routes) and browser (shop UI).

import { parseEther } from 'viem'

/**
 * Convert a USD price to whole+fractional DND721 token units.
 * Rounds UP to 6 decimal places so the buyer always sends enough.
 */
export function usdToDnd721Tokens(priceUsd: number, tokenPriceUsd: number): number {
  if (tokenPriceUsd <= 0) return 0
  const raw = priceUsd / tokenPriceUsd
  // Round up to 6 decimal places
  return Math.ceil(raw * 1_000_000) / 1_000_000
}

/**
 * Convert a USD price to DND721 token wei (18 decimals).
 * Uses the same rounding as usdToDnd721Tokens.
 */
export function usdToDnd721Wei(priceUsd: number, tokenPriceUsd: number): bigint {
  const tokens = usdToDnd721Tokens(priceUsd, tokenPriceUsd)
  // parseEther treats the string as an 18-decimal number
  return parseEther(tokens.toFixed(6))
}

/**
 * Format a token amount for display: e.g. 12.450000 → "12.45 DND721"
 * Trims unnecessary trailing zeros.
 */
export function formatTokens(tokens: number): string {
  if (!Number.isFinite(tokens)) return '— DND721'
  const s = tokens.toFixed(6).replace(/\.?0+$/, '')
  return `${s} DND721`
}

/**
 * Format seconds into HH:MM:SS countdown string.
 */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(sec).padStart(2, '0'),
  ].join(':')
}

/** Seconds until next midnight UTC */
export function secondsUntilMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  ))
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
}
