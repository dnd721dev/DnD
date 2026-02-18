'use client'

import { CharacterDraft } from '../types/characterDraft'

const DRAFT_KEY = 'dnd721_character_draft'

export function loadDraft(): CharacterDraft {
  if (typeof window === 'undefined') return {} as CharacterDraft

  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return {} as CharacterDraft

    return JSON.parse(raw) as CharacterDraft
  } catch {
    return {} as CharacterDraft
  }
}

export function saveDraft(update: Partial<CharacterDraft>) {
  if (typeof window === 'undefined') return

  const current = loadDraft()
  const merged: CharacterDraft = {
    ...current,
    ...update,
  }

  localStorage.setItem(DRAFT_KEY, JSON.stringify(merged))
}

export function clearDraft() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DRAFT_KEY)
}
