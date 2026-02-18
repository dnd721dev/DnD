'use client'

import Link from 'next/link'

type SessionRow = {
  id: string
  campaign_id: string | null
  title: string | null
  description: string | null
  scheduled_for: string | null
  status: string | null
  created_at: string
  updated_at: string
}

type CampaignRow = {
  id: string
  owner_wallet: string | null
  title: string
  description: string | null
  join_mode: 'open' | 'password'
  join_password_hash: string | null
  livekit_room_name: string | null
  status: string | null
  created_at: string | null
  map_image_url?: string | null
}

type TableHeaderProps = {
  session: SessionRow
  campaign: CampaignRow | null
  isGM: boolean
}

export function TableHeader({ session, campaign, isGM }: TableHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-300">
            Session Table
          </span>
          {campaign && (
            <Link
              href={`/campaigns/${campaign.id}`}
              className="text-[11px] text-slate-400 hover:text-sky-300"
            >
              ← Back to {campaign.title}
            </Link>
          )}
        </div>
        <h1 className="text-lg font-semibold text-slate-50">
          {session.title || 'Untitled Session'}
        </h1>
        <p className="text-xs text-slate-400">
          {session.description ||
            'Use this shared battlemap, dice, and initiative tracker for your DND721 session.'}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 text-right">
        <p className="text-xs text-slate-400">
          Status:{' '}
          <span className="font-medium text-slate-200">
            {session.status || 'Scheduled'}
          </span>
        </p>
        <p className="text-[11px] text-slate-500">
          {session.scheduled_for
            ? `Scheduled for ${new Date(
                session.scheduled_for
              ).toLocaleString()}`
            : 'No schedule set'}
        </p>
        <p className="text-[11px] text-slate-500">
          {isGM
            ? 'You are the DM for this table.'
            : 'You are a player at this table.'}
        </p>
      </div>
    </header>
  )
}
