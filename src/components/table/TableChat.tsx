'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Message = {
  id: string
  sender_wallet: string
  sender_name: string
  body: string
  kind: 'chat' | 'system' | 'whisper'
  created_at: string
}

type Props = {
  sessionId: string
  senderWallet: string | null
  senderName?: string
}

export default function TableChat({ sessionId, senderWallet, senderName = 'Adventurer' }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Load last 80 messages
  useEffect(() => {
    let mounted = true

    async function load() {
      const { data, error } = await supabase
        .from('session_messages')
        .select('id, sender_wallet, sender_name, body, kind, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(80)

      if (!mounted) return
      if (error) { console.error('chat load error', error); return }
      setMessages((data ?? []) as Message[])
    }

    load()

    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (!mounted) return
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const body = draft.trim()
    if (!body || !senderWallet) return
    setSending(true)

    const { error } = await supabase.from('session_messages').insert({
      session_id:    sessionId,
      sender_wallet: senderWallet.toLowerCase(),
      sender_name:   senderName,
      body,
      kind:          'chat',
    })

    setSending(false)
    if (error) { console.error('chat send error', error); return }
    setDraft('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  function shortWallet(w: string) {
    return w.length > 10 ? `${w.slice(0, 6)}…${w.slice(-4)}` : w
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col gap-1.5 h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 min-h-0" style={{ maxHeight: '340px' }}>
        {messages.length === 0 && (
          <p className="text-center text-[10px] text-slate-500 py-4">No messages yet. Say hello!</p>
        )}
        {messages.map((m) => {
          const isMe = senderWallet && m.sender_wallet === senderWallet.toLowerCase()
          const isSystem = m.kind === 'system'

          if (isSystem) {
            return (
              <div key={m.id} className="text-center text-[10px] text-slate-500 italic">
                {m.body}
              </div>
            )
          }

          return (
            <div key={m.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[10px] font-semibold ${isMe ? 'text-emerald-400' : 'text-yellow-300'}`}>
                  {m.sender_name || shortWallet(m.sender_wallet)}
                </span>
                <span className="text-[9px] text-slate-600">{formatTime(m.created_at)}</span>
              </div>
              <div
                className={`max-w-[90%] rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed break-words ${
                  isMe
                    ? 'bg-emerald-900/40 text-emerald-100 rounded-tr-none'
                    : 'bg-slate-800/80 text-slate-200 rounded-tl-none'
                }`}
              >
                {m.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {senderWallet ? (
        <div className="flex gap-1.5 pt-1 border-t border-slate-800">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={500}
            placeholder="Message the table… (Enter to send)"
            className="flex-1 resize-none rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-emerald-700 focus:outline-none"
          />
          <button
            onClick={() => void send()}
            disabled={sending || !draft.trim()}
            className="self-end rounded-md bg-emerald-800 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-700 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      ) : (
        <p className="text-center text-[10px] text-slate-500 pt-1 border-t border-slate-800">
          Connect wallet to chat.
        </p>
      )}
    </div>
  )
}
