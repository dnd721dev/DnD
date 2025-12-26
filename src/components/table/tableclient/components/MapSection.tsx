'use client'

import type { ChangeEvent } from 'react'
import MapBoard from '@/components/table/MapBoard'
import MapBoardView from '@/components/table/MapBoardView'
import { DiceLogOverlay } from './DiceLogOverlay'
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
  } = props

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
            <MapBoard encounterId={encounterId} mapImageUrl={mapUrl} gridSize={50} />
          ) : (
            <MapBoardView
              encounterId={encounterId}
              mapImageUrl={mapUrl}
              ownerWallet={address ?? null}
              gridSize={50}
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

        <DiceLogOverlay show={showDiceLog} diceLog={diceLog} onTestRoll={onTestRoll} onClose={onCloseDiceLog} />
      </div>
    </section>
  )
}
