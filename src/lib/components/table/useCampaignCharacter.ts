'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type CharacterRow = {
  id: string
  name: string
  level: number | null
  class_key: string | null
  race_key: string | null
  wallet_address?: string | null
}

export function useCampaignCharacter(args: { campaignId: string | null; walletAddress: string | null }) {
  const { campaignId, walletAddress } = args

  const [characterId, setCharacterId] = useState<string | null>(null)
  const [character, setCharacter] = useState<CharacterRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!campaignId || !walletAddress) {
      setCharacterId(null)
      setCharacter(null)
      setError(null)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)

      const selRes = await supabase
        .from('campaign_character_selections')
        .select('character_id')
        .eq('campaign_id', campaignId)
        .eq('wallet_address', walletAddress)
        .limit(1)
        .maybeSingle()

      if (selRes.error) {
        setError(selRes.error.message)
        setCharacterId(null)
        setCharacter(null)
        setLoading(false)
        return
      }

      const cid = (selRes.data as any)?.character_id ?? null
      setCharacterId(cid)

      if (!cid) {
        setCharacter(null)
        setLoading(false)
        return
      }

      const charRes = await supabase
        .from('characters')
        .select('id, name, level, class_key, race_key, wallet_address')
        .eq('id', cid)
        .limit(1)
        .maybeSingle()

      if (charRes.error) {
        setError(charRes.error.message)
        setCharacter(null)
        setLoading(false)
        return
      }

      setCharacter((charRes.data as any) ?? null)
      setLoading(false)
    }

    void load()
  }, [campaignId, walletAddress])

  return { characterId, character, loading, error }
}
