'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { TileData } from '@/lib/tilemap'

export type SessionMap = {
  id:          string
  session_id:  string
  name:        string
  tile_data:   TileData | null
  image_url:   string | null
  is_tile_map: boolean
  created_at:  string
}

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

  /** Create a new image-based map and return it */
  const createImageMap = async (name: string, imageUrl: string): Promise<SessionMap | null> => {
    if (!sessionId) return null
    const { data, error } = await supabase
      .from('maps')
      .insert({ session_id: sessionId, name, image_url: imageUrl, is_tile_map: false })
      .select()
      .maybeSingle()
    if (error) { console.error('createImageMap error', error); return null }
    const m = data as SessionMap
    setMaps((prev) => [...prev, m])
    return m
  }

  /** Create a new tile-based map and return it */
  const createTileMap = async (name: string, tileData: TileData): Promise<SessionMap | null> => {
    if (!sessionId) return null
    const { data, error } = await supabase
      .from('maps')
      .insert({ session_id: sessionId, name, tile_data: tileData, is_tile_map: true })
      .select()
      .maybeSingle()
    if (error) { console.error('createTileMap error', error); return null }
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

  return { maps, loading, createImageMap, createTileMap, updateTileMap, deleteMap, setCurrentMap, reloadMaps: loadMaps }
}
