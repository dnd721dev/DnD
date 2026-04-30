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
  /** GM-only: called when the GM confirms "End Session" */
  onEndSession?: () => Promise<void>
}) {
  const { session, isGm, address, displayName, roomName, showDiceLog, onToggleDiceLog, onEndSession } = props
  const [srdOpen, setSrdOpen] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [endingSession, setEndingSession] = useState(false)
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
            <VoiceChat
              roomName={roomName}
              identity={identity}
              isGm={isGm}
              sessionId={session.id}
            />
          </div>
          {/* Bug 18: GM End Session button */}
          {isGm && onEndSession && session.status !== 'completed' && (
            confirmEnd ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-rose-400">End session?</span>
                <button
                  type="button"
                  disabled={endingSession}
                  onClick={async () => {
                    setEndingSession(true)
                    await onEndSession()
                    setEndingSession(false)
                    setConfirmEnd(false)
                  }}
                  className="rounded-md bg-rose-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
                >
                  {endingSession ? '…' : 'Yes, End'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmEnd(false)}
                  className="rounded-md bg-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmEnd(true)}
                className="rounded-md bg-slate-800 px-2.5 py-1 text-[10px] font-medium text-rose-400 hover:bg-rose-900/50 hover:text-rose-300 transition"
                title="End this session (GM only)"
              >
                ⏹ End Session
              </button>
            )
          )}
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            session.status === 'completed' ? 'bg-slate-700 text-slate-400' : 'bg-slate-800 text-slate-200'
          }`}>
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
