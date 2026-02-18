'use client'

import type { ChangeEvent } from 'react'
import { useMemo } from 'react'
import MapBoard from '@/components/table/MapBoard'
import MapBoardView from '@/components/table/MapBoardView'
import { DiceLogOverlay } from './DiceLogOverlay'
import DiceRollOverlay from './DiceRollOverlay'
import type { DiceEntry } from '../types'

export function MapSection(props: {
  mapUrl: string
  encounterId: string | null
  encounterLoading: boolean
  encounterError: string | null
  isGm: boolean
  address: string | undefined
  onMapUpload: (e: ChangeEvent<HTMLInputElement>) => void
  showDiceLog: boolean
  diceLog: DiceEntry[]
  onTestRoll: () => void
  onCloseDiceLog: () => void

  // 🎲 quick roll animation overlay
  rollOverlay?: null | { roller: string; label: string; formula: string; result: number }

  // ✅ keep these if you’re passing them
  speedFeet?: number
  visionFeet?: number

  // ✅ player character id (for movement/action tracking)
  characterId?: string | null

  // ✅ if your dropdown already sets this, pass it in (or ignore if you don’t use it here)
  viewAsWallet?: string | null
}) {
  const {
    mapUrl,
    encounterId,
    encounterLoading,
    encounterError,
    isGm,
    address,
    onMapUpload,
    showDiceLog,
    diceLog,
    onTestRoll,
    onCloseDiceLog,
    rollOverlay,
    speedFeet,
    visionFeet,
    characterId,
    viewAsWallet,
  } = props

  // ✅ Player POV wallet:
  // - Player: always themselves
  // - GM: only when explicitly viewing a player
  const povWallet = useMemo(() => {
    if (isGm) return (viewAsWallet ?? null)
    return address ?? null
  }, [isGm, viewAsWallet, address])

  return (
    <section className="relative h-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
      <div className="relative w-full min-h-[calc(100vh-180px)] overflow-hidden bg-[radial-gradient(circle_at_top,_#1e293b,_#020617)] p-3">
        {mapUrl ? (
          encounterLoading || !encounterId ? (
            <div className="flex h-full items-center justify-center text-center text-slate-400">
              <div className="px-4">
                <p className="text-sm font-semibold text-slate-200">Preparing encounter board…</p>
                {encounterError && <p className="mt-1 text-xs text-red-400">{encounterError}</p>}
              </div>
            </div>
          ) : isGm ? (
            // ✅ GM MODE:
            // - If NO player selected (GM Free View) => MapBoard (NO FOG)
            // - If player selected => MapBoardView (FOG POV)
            povWallet ? (
              <MapBoardView
                encounterId={encounterId}
                mapImageUrl={mapUrl}
                ownerWallet={povWallet}
                characterId={characterId ?? null}
                gridSize={50}
                speedFeet={speedFeet}
                visionFeet={visionFeet}
              />
            ) : (
              <MapBoard encounterId={encounterId} mapImageUrl={mapUrl} gridSize={50} />
            )
          ) : (
            // ✅ PLAYER MODE (always fog POV)
            <MapBoardView
              encounterId={encounterId}
              mapImageUrl={mapUrl}
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

              {isGm && (
                <div className="mt-4 space-y-2">
                  <label className="text-xs text-slate-300">Upload a map image (PNG/JPG)</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={onMapUpload}
                    className="text-xs text-slate-100"
                  />
                </div>
              )}

              {!isGm && <p className="mt-1 text-xs text-slate-400">Waiting for GM to upload a map…</p>}
            </div>
          </div>
        )}

        <DiceRollOverlay show={Boolean(rollOverlay)} payload={rollOverlay ?? null} />
        <DiceLogOverlay show={showDiceLog} diceLog={diceLog} onTestRoll={onTestRoll} onClose={onCloseDiceLog} />
      </div>
    </section>
  )
}
