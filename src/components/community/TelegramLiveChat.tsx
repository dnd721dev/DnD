'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Read-only live feed of the DND721 Telegram group. Messages are mirrored into
// telegram_messages by /api/telegram/webhook; we load the recent ones and
// stream new ones via Supabase Realtime. To comment, users join the group
// on Telegram (button below) — there's no in-page posting.

const TELEGRAM_URL = 'https://t.me/DND721'

type TgMessage = {
  id: string
  sender_name: string
  text: string
  created_at: string
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export function TelegramLiveChat() {
  const [messages, setMessages] = useState<TgMessage[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)

  // Initial load (most recent 50, oldest-first for display).
  useEffect(() => {
    let mounted = true
    supabase
      .from('telegram_messages')
      .select('id, sender_name, text, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!mounted) return
        setMessages(((data ?? []) as TgMessage[]).slice().reverse())
        setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  // Live updates.
  useEffect(() => {
    const ch = supabase
      .channel('telegram-live-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'telegram_messages' },
        (payload) => {
          const row = payload.new as TgMessage
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // Auto-scroll to bottom when new messages arrive (only if already near bottom).
  useEffect(() => {
    const el = scrollRef.current
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight
  }, [messages])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  return (
    <div className="flex h-[480px] flex-col">
      {/* Live header */}
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-slate-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        Live from the DND721 Telegram group
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/50 p-3"
      >
        {loading ? (
          <p className="text-center text-xs text-slate-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-xs text-slate-500">
              Live chat starting soon — join on Telegram to get the conversation going.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span className="font-semibold text-sky-300">{m.sender_name}</span>
              <span className="ml-2 text-[10px] text-slate-600">{fmtTime(m.created_at)}</span>
              <p className="whitespace-pre-wrap break-words text-slate-200">{m.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Join-to-comment CTA (read-only feed) */}
      <a
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block rounded-lg bg-sky-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-sky-500"
      >
        💬 Join on Telegram to comment →
      </a>
    </div>
  )
}
