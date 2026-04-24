'use client'

import { useState } from 'react'
import VoiceChat from '@/components/table/VoiceChat'
import { RecordingButton } from './RecordingButton'
import { SrdSearchOverlay } from '@/components/table/SrdSearchOverlay'
import type { SessionWithCampaign } from '../types'
import { formatDateTime } from '../utils'

export function TableTopBar(props: {
  session: SessionWithCampaign
  isGm: boolean
  address: string | undefined
  /** Profile display_name for the current user — falls back to shortened wallet if absent */
  displayName?: string | null
  roomName: string
  showDiceLog: boolean
  onToggleDiceLog: () => void
}) {
  const { session, isGm, address, displayName, roomName, showDiceLog, onToggleDiceLog } = props
  const [srdOpen, setSrdOpen] = useState(false)
  const identity = address?.toLowerCase()
  const campaignMeta = session.campaigns?.[0]

  return (
    <>
    <SrdSearchOverlay open={srdOpen} onClose={() => setSrdOpen(false)} />
    <header className="flex flex-col gap-2 rounded-xl border border-yellow-900/40 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-yellow-300/60">
          DND721 Session Table {isGm ? '· GM' : '· Player'}
        </p>
        <h1 className="text-lg font-bold text-yellow-200 sm:text-xl">
          {session.title || 'Untitled Session'}
        </h1>
        <p className="text-xs text-slate-400">
          {campaignMeta?.title && (
            <>
              Campaign: <span className="text-slate-200">{campaignMeta.title}</span> ·{' '}
            </>
          )}
          {formatDateTime(session.scheduled_start)} · {session.duration_minutes} min
        </p>
      </div>

      <div className="flex flex-col items-start gap-2 text-xs text-slate-300 sm:items-end">
        <div className="flex items-center gap-2">
          {isGm && (
            <RecordingButton sessionId={session.id} roomName={roomName} />
          )}
          <button
            type="button"
            onClick={() => setSrdOpen(true)}
            className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700"
            title="SRD spell & monster search (spells, monsters)"
          >
            📖 SRD
          </button>
          <button
            type="button"
            onClick={onToggleDiceLog}
            className="rounded-md bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-700"
          >
            {showDiceLog ? 'Hide Dice Log' : 'Show Dice Log'}
          </button>
          <div className="shrink-0">
            <VoiceChat roomName={roomName} identity={identity} />
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide">
            {session.status}
          </span>
          {address ? (
            <p
              className="text-slate-400"
              title={address}
            >
              You:{' '}
              <span className={displayName?.trim() ? 'text-slate-200' : 'font-mono'}>
                {displayName?.trim() || `${address.slice(0, 6)}…${address.slice(-4)}`}
              </span>{' '}
              {isGm && <span className="text-emerald-400">(GM)</span>}
            </p>
          ) : (
            <p className="text-xs text-amber-400">Connect your wallet to join this table.</p>
          )}
        </div>
      </div>
    </header>
    </>
  )
}
