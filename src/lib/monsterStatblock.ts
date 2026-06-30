// src/lib/monsterStatblock.ts
// Resolve a monster stat block for a token, across the three sources:
//   • homebrew_monster_id  → homebrew_monsters table (UUID)
//   • monster_id 'srd:<key>' → client-side MONSTERS array
//   • monster_id 'db:<uuid>' → legacy monsters table
// Extracted from DMPanel.loadStatblockForToken so the DM dashboard's Battle
// console and the table panel share one resolver.

import { supabase } from '@/lib/supabase'
import { MONSTERS } from '@/lib/monsters'

export type TokenLike = {
  id?: string
  type?: string | null
  label?: string | null
  monster_id?: string | null
  homebrew_monster_id?: string | null
}

export async function resolveMonsterStatblock(tok: TokenLike | null | undefined): Promise<any | null> {
  if (!tok) return null

  if (tok.homebrew_monster_id) {
    const { data, error } = await supabase
      .from('homebrew_monsters')
      .select('*')
      .eq('id', tok.homebrew_monster_id)
      .limit(1)
      .maybeSingle()
    if (error) console.error('[monsterStatblock] homebrew load error', error)
    return data ?? null
  }

  if (tok.type !== 'monster' || !tok.monster_id) return null

  const monsterId = String(tok.monster_id)
  if (monsterId.startsWith('srd:')) {
    const key = monsterId.replace('srd:', '')
    return (
      (MONSTERS as any[]).find(
        (m: any) =>
          m.id === key ||
          m.slug === key ||
          m.name?.toLowerCase() === tok.label?.toLowerCase(),
      ) ?? null
    )
  }
  if (monsterId.startsWith('db:')) {
    const dbId = monsterId.replace('db:', '')
    const { data, error } = await supabase
      .from('monsters')
      .select('*')
      .eq('id', dbId)
      .limit(1)
      .maybeSingle()
    if (error) console.error('[monsterStatblock] db load error', error)
    return data ?? null
  }
  return null
}

/** Is this token a monster (vs a PC/object)? */
export function tokenIsMonster(tok: TokenLike | null | undefined): boolean {
  return !!tok && (tok.type === 'monster' || !!tok.homebrew_monster_id)
}
