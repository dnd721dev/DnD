'use client'

import { useAccount } from 'wagmi'
import VoiceChat from '@/components/table/VoiceChat'
import { TelegramLiveChat } from '@/components/community/TelegramLiveChat'

const TELEGRAM_URL = 'https://t.me/DND721'
// One shared community voice room — any visitor can drop in.
const COMMUNITY_VOICE_ROOM = 'dnd721-community-lounge'

export default function CommunityPage() {
  const { address } = useAccount()
  const identity = address?.toLowerCase()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Community</h1>
        <p className="mt-1 text-sm text-slate-400">
          Chat with the DND721 community on Telegram and hop into the voice lounge — right here.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Telegram community chat — live read-only feed */}
        <section className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">💬 Telegram Community</h2>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              Open in Telegram →
            </a>
          </div>
          <TelegramLiveChat />
        </section>

        {/* Community voice lounge */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">🎙 Voice Lounge</h2>
          <p className="mb-4 text-xs text-slate-400">
            Drop into the open community voice channel. No wallet required — connect to use your name,
            or join as a guest.
          </p>
          <VoiceChat roomName={COMMUNITY_VOICE_ROOM} identity={identity} />
        </section>
      </div>
    </div>
  )
}
