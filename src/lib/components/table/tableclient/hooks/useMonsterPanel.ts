'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MONSTERS } from '@/lib/monsters'

export function useMonsterPanel() {
  const [openMonsterToken, setOpenMonsterToken] = useState<any | null>(null)
  const [openMonsterData, setOpenMonsterData] = useState<any | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = (event: any) => {
      const token = event?.detail?.token
      if (!token) return
      setOpenMonsterToken(token)
    }

    window.addEventListener('dnd721-open-monster', handler as EventListener)
    return () => {
      window.removeEventListener('dnd721-open-monster', handler as EventListener)
    }
  }, [])

  useEffect(() => {
    async function loadMonster() {
      if (!openMonsterToken?.monster_id) {
        setOpenMonsterData(null)
        return
      }

      const monsterId = String(openMonsterToken.monster_id)

      // SRD monster from MONSTERS list
      if (monsterId.startsWith('srd:')) {
        const key = monsterId.replace('srd:', '')
        const found = (MONSTERS as any[]).find(
          (m: any) =>
            m.id === key ||
            m.slug === key ||
            m.name?.toLowerCase() === openMonsterToken.label?.toLowerCase()
        )
        setOpenMonsterData(found ?? null)
        return
      }

      // Custom monster stored in Supabase "monsters" table
      if (monsterId.startsWith('db:')) {
        const dbId = monsterId.replace('db:', '')
        const { data, error } = await supabase
          .from('monsters')
          .select('*')
          .eq('id', dbId)
          .limit(1).maybeSingle()

        if (error) {
          console.error('Error loading monster from DB', error)
        }

        setOpenMonsterData(data ?? null)
        return
      }

      setOpenMonsterData(null)
    }

    void loadMonster()
  }, [openMonsterToken])

  return { openMonsterToken, setOpenMonsterToken, openMonsterData, setOpenMonsterData }
}
