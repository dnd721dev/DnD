'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CharacterSummary } from '../types'

export function useSessionCharacters(params: {
  address: string | undefined
  sessionId: string
  hasMounted: boolean
}) {
  const { address, sessionId, hasMounted } = params
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterSummary | null>(null)
  const [charsLoading, setCharsLoading] = useState(false)
  const [charsError, setCharsError] = useState<string | null>(null)

  useEffect(() => {
    if (!address || !hasMounted || !sessionId) return

    async function loadCharactersForWallet() {
      setCharsLoading(true)
      setCharsError(null)

      const { data: link, error: linkError } = await supabase
        .from('session_characters')
        .select('character_id')
        .eq('session_id', sessionId)
        .eq('wallet_address', address)
        .limit(1).maybeSingle()

      if (linkError && linkError.code !== 'PGRST116') {
        console.error('session_characters error', linkError)
      }

      const linkedCharacterId = (link as any)?.character_id ?? null

      const { data: charRows, error: charError } = await supabase
        .from('characters')
        .select('*')
        .eq('wallet_address', address)
        .order('created_at', { ascending: true })

      if (charError) {
        console.error('characters error', charError)
        setCharsError(charError.message)
        setCharacters([])
        setSelectedCharacter(null)
        setCharsLoading(false)
        return
      }

      const chars = (charRows ?? []) as CharacterSummary[]
      setCharacters(chars)

      if (linkedCharacterId) {
        const existing = chars.find(c => c.id === linkedCharacterId)
        setSelectedCharacter(existing ?? null)
      } else {
        setSelectedCharacter(null)
      }

      setCharsLoading(false)
    }

    loadCharactersForWallet()
  }, [address, sessionId, hasMounted])

  return {
    characters,
    setCharacters,
    selectedCharacter,
    setSelectedCharacter,
    charsLoading,
    charsError,
    setCharsError,
  }
}
