'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { TileData } from '@/lib/tilemap'

export type SessionMap = {
  id:            string
  session_id:    string | null
  name:          string
  tile_data:     TileData | null
  image_url:     string | null
  is_tile_map:   boolean
  visibility:    'public' | 'private'
  owner_wallet:  string | null
  mint_status?:  'unminted' | 'pending' | 'minted'
  created_at:    string
}

export type MapVisibility = 'public' | 'private'

export function useMapManager(sessionId: string | null) {
  const [maps, setMaps] = useState<SessionMap[]>([])
  const [loading, setLoading] = useState(false)

  const loadMaps = useCallback(async () => {
    if (!sessionId) { setMaps([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (!error) setMaps((data ?? []) as SessionMap[])
    setLoading(false)
  }, [sessionId])

  useEffect(() => { loadMaps() }, [loadMaps])

  /**
   * Fetch the entire platform-wide map library. RLS returns:
   *   • every map with visibility='public', plus
   *   • the connected GM's own private maps.
   * Cap at 200 most-recent rows for UI sanity.
   */
  const loadAllMaps = useCallback(async (): Promise<SessionMap[]> => {
    const { data, error } = await supabase
      .from('maps')
      .select('id, session_id, name, tile_data, image_url, is_tile_map, visibility, owner_wallet, mint_status, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) { console.error('loadAllMaps error', error); return [] }
    return (data ?? []) as SessionMap[]
  }, [])

  /** Create a new image-based map and return it */
  const createImageMap = async (
    name: string,
    imageUrl: string,
    opts: { visibility?: MapVisibility; ownerWallet?: string | null } = {}
  ): Promise<SessionMap | null> => {
    if (!sessionId) return null
    const { data, error } = await supabase
      .from('maps')
      .insert({
        session_id:   sessionId,
        name,
        image_url:    imageUrl,
        is_tile_map:  false,
        visibility:   opts.visibility ?? 'public',
        owner_wallet: opts.ownerWallet ?? null,
      })
      .select()
      .maybeSingle()
    if (error) { console.error('createImageMap error', error); return null }
    const m = data as SessionMap
    setMaps((prev) => [...prev, m])
    return m
  }

  /** Create a new tile-based map and return it */
  const createTileMap = async (
    name: string,
    tileData: TileData,
    opts: { visibility?: MapVisibility; ownerWallet?: string | null } = {}
  ): Promise<SessionMap | null> => {
    if (!sessionId) return null
    const { data, error } = await supabase
      .from('maps')
      .insert({
        session_id:   sessionId,
        name,
        tile_data:    tileData,
        is_tile_map:  true,
        visibility:   opts.visibility ?? 'public',
        owner_wallet: opts.ownerWallet ?? null,
      })
      .select()
      .maybeSingle()
    if (error) { console.error('createTileMap error', error); return null }
    const m = data as SessionMap
    setMaps((prev) => [...prev, m])
    return m
  }

  /**
   * Clone a library map into the current session. The Storage file (image_url)
   * is shared — only a new row is inserted — so deleting the clone here can't
   * affect the source row in another session. Preserves visibility + owner.
   */
  const cloneMapToSession = async (src: SessionMap): Promise<SessionMap | null> => {
    if (!sessionId) return null
    const { data, error } = await supabase
      .from('maps')
      .insert({
        session_id:   sessionId,
        name:         src.name,
        image_url:    src.image_url,
        tile_data:    src.tile_data,
        is_tile_map:  src.is_tile_map,
        visibility:   src.visibility,
        owner_wallet: src.owner_wallet,
      })
      .select()
      .maybeSingle()
    if (error) { console.error('cloneMapToSession error', error); return null }
    const m = data as SessionMap
    setMaps((prev) => [...prev, m])
    return m
  }

  /** Update tile data on an existing tile map */
  const updateTileMap = async (mapId: string, tileData: TileData): Promise<void> => {
    const { error } = await supabase
      .from('maps')
      .update({ tile_data: tileData })
      .eq('id', mapId)
    if (error) { console.error('updateTileMap error', error); return }
    setMaps((prev) => prev.map((m) => (m.id === mapId ? { ...m, tile_data: tileData } : m)))
  }

  /** Delete a map */
  const deleteMap = async (mapId: string): Promise<void> => {
    const { error } = await supabase.from('maps').delete().eq('id', mapId)
    if (error) { console.error('deleteMap error', error); return }
    setMaps((prev) => prev.filter((m) => m.id !== mapId))
  }

  /** Set the active map for a session — broadcasts to all clients via realtime */
  const setCurrentMap = async (sid: string, mapId: string | null): Promise<void> => {
    const { error } = await supabase
      .from('sessions')
      .update({ current_map_id: mapId })
      .eq('id', sid)
    if (error) console.error('setCurrentMap error', error)
  }

  return {
    maps,
    loading,
    createImageMap,
    createTileMap,
    updateTileMap,
    deleteMap,
    setCurrentMap,
    reloadMaps: loadMaps,
    loadAllMaps,
    cloneMapToSession,
  }
}
