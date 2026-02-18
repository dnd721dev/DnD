'use client'

import VoiceChat from '@/components/table/VoiceChat'
import type { SessionWithCampaign } from '../types'
import { formatDateTime } from '../utils'

export function TableTopBar(props: {
  session: SessionWithCampaign
  isGm: boolean
  address: string | undefined
  roomName: string
  showDiceLog: boolean
  onToggleDiceLog: () => void
}) {
  const { session, isGm, address, roomName, showDiceLog, onToggleDiceLog } = props
  const campaignMeta = session.campaigns?.[0]

  return (
    <header className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">
          DND721 Session Table {isGm ? '· GM' : '· Player'}
        </p>
        <h1 className="text-lg font-bold text-slate-50 sm:text-xl">
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
          <button
            type="button"
            onClick={onToggleDiceLog}
            className="rounded-md bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-700"
          >
            {showDiceLog ? 'Hide Dice Log' : 'Show Dice Log'}
          </button>
          <div className="shrink-0">
            <VoiceChat
              // extra prop ignored by the simple VoiceChat component
              // @ts-expect-error
              roomName={roomName}
            />
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide">
            {session.status}
          </span>
          {address ? (
            <p className="font-mono text-slate-400">
              You: {address.slice(0, 6)}…{address.slice(-4)}{' '}
              {isGm && <span className="text-emerald-400">(GM)</span>}
            </p>
          ) : (
            <p className="text-xs text-amber-400">Connect your wallet to join this table.</p>
          )}
        </div>
      </div>
    </header>
  )
}
