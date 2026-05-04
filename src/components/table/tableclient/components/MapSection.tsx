'use client'

import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import MapBoard from '@/components/table/MapBoard'
import MapBoardView from '@/components/table/MapBoardView'
import { DiceLogOverlay } from './DiceLogOverlay'
import { DiceRollOverlay } from './DiceRollOverlay'
import { DiceCanvas3D } from '@/components/dice/DiceCanvas3D'
import type { DiceEntry } from '../types'
import type { SessionMap } from '../hooks/useMapManager'
import type { SessionStatus } from '@/lib/sessionGates'

export function MapSection(props: {
  // Map — either a full SessionMap or a fallback legacy URL
  currentMap?: SessionMap | null
  legacyMapUrl?: string

  encounterId: string | null
  encounterLoading: boolean
  encounterError: string | null
  isGm: boolean
  address: string | undefined
  viewAsWallet?: string | null
  characterId?: string | null
  speedFeet?: number
  visionFeet?: number
  sessionPlayerWallets?: string[]
  /** Current session lifecycle status — threaded down to MapBoard / MapBoardView */
  sessionStatus?: SessionStatus | null

  showDiceLog: boolean
  diceLog: DiceEntry[]
  onTestRoll: () => void
  onCloseDiceLog: () => void
  onRollEntry?: (entry: DiceEntry) => void
  sessionId?: string
  rollerName?: string
  rollerWallet?: string
  rollOverlay?: null | { roller: string; label: string; formula: string; result: number }

  // Shown inside the map area when no map is set (GM only)
  mapControls?: React.ReactNode
}) {
  const {
    currentMap,
    legacyMapUrl,
    encounterId,
    encounterLoading,
    encounterError,
    isGm,
    address,
    viewAsWallet,
    characterId,
    speedFeet,
    visionFeet,
    sessionPlayerWallets,
    showDiceLog,
    diceLog,
    onTestRoll,
    onCloseDiceLog,
    onRollEntry,
    sessionId,
    rollerName,
    rollerWallet,
    rollOverlay,
    mapControls,
    sessionStatus,
  } = props

  const [isFullscreen, setIsFullscreen] = useState(false)

  // Sync body class so the root-layout <header> and <main> padding hide/restore
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('map-fullscreen')
    } else {
      document.body.classList.remove('map-fullscreen')
    }
    // Clean up on unmount (e.g. navigating away while fullscreen)
    return () => { document.body.classList.remove('map-fullscreen') }
  }, [isFullscreen])

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isFullscreen])

  // Derive what to show on the map canvas
  const mapImageUrl = currentMap?.image_url ?? legacyMapUrl ?? ''
  const tileData = currentMap?.is_tile_map ? currentMap.tile_data : null
  const mapId = currentMap?.id ?? null

  const hasMap = Boolean(currentMap || legacyMapUrl)

  // POV wallet: player = themselves, GM only when "view as" is selected
  const povWallet = useMemo(() => {
    if (isGm) return viewAsWallet ?? null
    return address ?? null
  }, [isGm, viewAsWallet, address])

  return (
    <section className={`relative overflow-hidden border border-slate-800 bg-slate-950/80 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full rounded-xl'}`}>
      {/* Fullscreen toggle button */}
      <button
        type="button"
        onClick={() => setIsFullscreen(v => !v)}
        title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen map'}
        className="pointer-events-auto absolute right-2 top-2 z-10 rounded-md border border-slate-600/60 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-400/60 hover:text-white backdrop-blur-sm"
      >
        {isFullscreen ? '⛶ Exit' : '⛶'}
      </button>
      <div className={`relative w-full overflow-hidden bg-[radial-gradient(circle_at_top,_#1e293b,_#020617)] p-3 ${isFullscreen ? 'h-full' : 'min-h-[calc(100vh-180px)]'}`}>

        {hasMap ? (
          encounterLoading || !encounterId ? (
            <div className="flex h-full items-center justify-center text-center text-slate-400">
              <div className="px-4">
                <p className="text-sm font-semibold text-slate-200">Preparing encounter board…</p>
                {encounterError && <p className="mt-1 text-xs text-red-400">{encounterError}</p>}
              </div>
            </div>
          ) : isGm ? (
            // GM MODE:
            // No player selected → MapBoard (no fog, full GM view)
            // Player selected → MapBoardView (player fog POV)
            povWallet ? (
              <MapBoardView
                encounterId={encounterId}
                mapImageUrl={mapImageUrl || undefined}
                tileData={tileData}
                mapId={mapId}
                ownerWallet={povWallet}
                characterId={characterId ?? null}
                gridSize={50}
                speedFeet={speedFeet}
                visionFeet={visionFeet}
                sessionStatus={sessionStatus}
                isGm={true}
                sessionPlayerWallets={sessionPlayerWallets}
              />
            ) : (
              <MapBoard
                encounterId={encounterId}
                mapImageUrl={mapImageUrl || undefined}
                tileData={tileData}
                mapId={mapId}
                gridSize={50}
                sessionPlayerWallets={sessionPlayerWallets}
                sessionStatus={sessionStatus}
              />
            )
          ) : (
            // PLAYER MODE — always fog POV
            <MapBoardView
              encounterId={encounterId}
              mapImageUrl={mapImageUrl || undefined}
              tileData={tileData}
              mapId={mapId}
              ownerWallet={povWallet}
              characterId={characterId ?? null}
              gridSize={50}
              speedFeet={speedFeet}
              visionFeet={visionFeet}
              sessionStatus={sessionStatus}
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-center text-slate-400">
            <div className="px-4">
              <p className="text-sm font-semibold text-slate-200">No map set for this session.</p>
              {isGm && mapControls && (
                <div className="mt-4">{mapControls}</div>
              )}
              {!isGm && <p className="mt-1 text-xs text-slate-400">Waiting for GM to load a map…</p>}
            </div>
          </div>
        )}

        <DiceCanvas3D roll={rollOverlay ?? null} show={Boolean(rollOverlay)} />
        <DiceRollOverlay show={Boolean(rollOverlay)} payload={rollOverlay ?? null} />
        <DiceLogOverlay
          show={showDiceLog}
          diceLog={diceLog}
          onTestRoll={onTestRoll}
          onClose={onCloseDiceLog}
          sessionId={sessionId}
          rollerName={rollerName}
          rollerWallet={rollerWallet}
          onRollEntry={onRollEntry}
        />
      </div>
    </section>
  )
}
