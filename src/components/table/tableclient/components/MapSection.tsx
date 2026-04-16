'use client'

import type { ChangeEvent } from 'react'
import { useMemo } from 'react'
import MapBoard from '@/components/table/MapBoard'
import MapBoardView from '@/components/table/MapBoardView'
import { DiceLogOverlay } from './DiceLogOverlay'
import { DiceRollOverlay } from './DiceRollOverlay'
import { DiceCanvas3D } from '@/components/dice/DiceCanvas3D'
import type { DiceEntry } from '../types'
import type { SessionMap } from '../hooks/useMapManager'

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
  } = props

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
    <section className="relative h-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
      <div className="relative w-full min-h-[calc(100vh-180px)] overflow-hidden bg-[radial-gradient(circle_at_top,_#1e293b,_#020617)] p-3">

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
              />
            ) : (
              <MapBoard
                encounterId={encounterId}
                mapImageUrl={mapImageUrl || undefined}
                tileData={tileData}
                mapId={mapId}
                gridSize={50}
                sessionPlayerWallets={sessionPlayerWallets}
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
