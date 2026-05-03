'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SESSION_GATES, type SessionStatus } from '@/lib/sessionGates'

type Message = {
  id: string
  sender_wallet: string
  sender_name: string
  body: string
  kind: 'chat' | 'system' | 'whisper'
  whisper_to: string | null
  created_at: string
}

type Participant = {
  wallet: string
  name: string
  avatarUrl?: string | null
}

type Props = {
  sessionId: string
  senderWallet: string | null
  senderName?: string
  sessionStatus?: SessionStatus | null
}

export default function TableChat({ sessionId, senderWallet, senderName = 'Adventurer', sessionStatus }: Props) {
  const canChat = !sessionStatus || SESSION_GATES.canChat(sessionStatus)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [whisperMode, setWhisperMode] = useState(false)
  const [whisperTarget, setWhisperTarget] = useState<string>('')
  const [participants, setParticipants] = useState<Participant[]>([])
  // wallet → avatar URL for rendering message bubbles
  const [avatarMap, setAvatarMap] = useState<Record<string, string | null>>({})
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Load session participants for whisper dropdown (includes GM)
  // Bug fixes applied here:
  //   Bug 2/4: query now uses characters join (has FK) instead of the broken
  //            profiles join (FK added by 023_chat_fixes.sql — safe to use both).
  //   Bug 3:   characters.avatar_url (NFT image) takes priority over
  //            profiles.avatar_url (manual upload, usually null).
  //   Bug 6:   realtime subscription on session_players refreshes the list
  //            when a new player joins mid-session.
  useEffect(() => {
    if (!senderWallet) return
    const myWallet = (senderWallet ?? '').toLowerCase()

    async function loadParticipants() {
      // Join both characters (has FK via character_id) and profiles
      // (FK added by migration 023). characters.avatar_url is the NFT
      // image and takes priority.
      const { data: playerRows, error } = await supabase
        .from('session_players')
        .select('wallet_address, characters(name, avatar_url), profiles(display_name, username, avatar_url)')
        .eq('session_id', sessionId)

      if (error) {
        // Log but don't bail — the GM entry below is still fetchable.
        console.error('[TableChat] loadParticipants query error', error)
      }

      const newAvatarMap: Record<string, string | null> = {}

      const list: Participant[] = ((playerRows ?? []) as any[])
        .map((row) => {
          const char    = row.characters as { name?: string; avatar_url?: string | null } | null
          const profile = row.profiles   as { display_name?: string; username?: string; avatar_url?: string | null } | null
          const wallet  = (row.wallet_address as string).toLowerCase()
          // Bug 3: prefer NFT image (characters.avatar_url) over profile avatar
          const avatarUrl = char?.avatar_url ?? profile?.avatar_url ?? null
          const name =
            char?.name ||
            profile?.display_name ||
            profile?.username ||
            shortWallet(row.wallet_address as string)
          if (avatarUrl) newAvatarMap[wallet] = avatarUrl
          return { wallet, name, avatarUrl }
        })
        .filter((p) => p.wallet !== myWallet)

      // Also include the GM so players can whisper to them (GM may not be in session_players)
      const { data: sessionRow } = await supabase
        .from('sessions')
        .select('gm_wallet')
        .eq('id', sessionId)
        .maybeSingle()

      const gmWallet = (sessionRow as any)?.gm_wallet?.toLowerCase() ?? null
      if (gmWallet && gmWallet !== myWallet && !list.some(p => p.wallet === gmWallet)) {
        // Fetch GM's NFT avatar from their most-recent character, fall back to profile
        const [{ data: gmChar }, { data: gmProfile }] = await Promise.all([
          supabase
            .from('characters')
            .select('name, avatar_url')
            .eq('wallet_address', gmWallet)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('display_name, username, avatar_url')
            .eq('wallet_address', gmWallet)
            .maybeSingle(),
        ])
        const gmName =
          (gmProfile as any)?.display_name ||
          (gmProfile as any)?.username ||
          'GM'
        const gmAvatar =
          (gmChar as any)?.avatar_url ??
          (gmProfile as any)?.avatar_url ??
          null
        if (gmAvatar) newAvatarMap[gmWallet] = gmAvatar
        list.unshift({ wallet: gmWallet, name: gmName, avatarUrl: gmAvatar })
      }

      // Sender's own avatar for outgoing message display
      if (myWallet) {
        const [{ data: myChar }, { data: myProfile }] = await Promise.all([
          supabase
            .from('characters')
            .select('avatar_url')
            .eq('wallet_address', myWallet)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('avatar_url')
            .eq('wallet_address', myWallet)
            .maybeSingle(),
        ])
        const myAvatar =
          (myChar as any)?.avatar_url ??
          (myProfile as any)?.avatar_url ??
          null
        if (myAvatar) newAvatarMap[myWallet] = myAvatar
      }

      setAvatarMap(newAvatarMap)
      setParticipants(list)
    }

    void loadParticipants()

    // Bug 6: refresh participant list when players join or leave mid-session.
    // session_players is in the realtime publication (added by migration 011).
    const channel = supabase
      .channel(`chat-participants-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_players', filter: `session_id=eq.${sessionId}` },
        () => { void loadParticipants() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId, senderWallet])

  // Load last 80 messages
  useEffect(() => {
    let mounted = true

    async function load() {
      const { data, error } = await supabase
        .from('session_messages')
        .select('id, sender_wallet, sender_name, body, kind, whisper_to, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(80)

      if (!mounted) return
      if (error) { console.error('chat load error', error); return }

      // Bug 5: client-side whisper filter mirrors the realtime handler.
      // This is a defence-in-depth guard — the DB-level RLS policy (from
      // 002_rebuild_backend.sql, restored by 023_chat_fixes.sql dropping the
      // open policy) is the primary enforcement.  If RLS ever regresses this
      // ensures non-recipients never render whispers from the initial load.
      const wallet = senderWallet?.toLowerCase() ?? null
      const visible = (data ?? []).filter((m: any) => {
        if (m.kind !== 'whisper') return true
        if (!wallet) return false
        return m.sender_wallet === wallet || m.whisper_to === wallet
      })
      setMessages(visible as Message[])
    }

    load()

    const myWallet = senderWallet?.toLowerCase() ?? null

    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (!mounted) return
          const msg = payload.new as Message
          // Whisper guard: only show if we're the sender or the recipient
          if (msg.kind === 'whisper' && myWallet) {
            if (msg.sender_wallet !== myWallet && msg.whisper_to !== myWallet) return
          }
          setMessages((prev) => [...prev, msg])
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [sessionId, senderWallet])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const body = draft.trim()
    if (!body || !senderWallet) return
    if (whisperMode && !whisperTarget) return  // whisper needs a recipient

    setSending(true)

    const row: Record<string, unknown> = {
      session_id:    sessionId,
      sender_wallet: senderWallet.toLowerCase(),
      sender_name:   senderName,
      body,
      kind:          whisperMode ? 'whisper' : 'chat',
    }
    if (whisperMode && whisperTarget) {
      row.whisper_to = whisperTarget
    }

    const { error } = await supabase.from('session_messages').insert(row)

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

  function toggleWhisperMode() {
    setWhisperMode((prev) => {
      if (!prev && participants.length > 0 && !whisperTarget) {
        setWhisperTarget(participants[0].wallet)
      }
      return !prev
    })
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
          const isWhisper = m.kind === 'whisper'

          if (isSystem) {
            return (
              <div key={m.id} className="text-center text-[10px] text-slate-500 italic">
                {m.body}
              </div>
            )
          }

          if (isWhisper) {
            const recipientName =
              participants.find((p) => p.wallet === m.whisper_to)?.name ||
              shortWallet(m.whisper_to ?? '???')
            const label = isMe ? `🤫 Whisper → ${recipientName}` : `🤫 Whisper from ${m.sender_name}`

            return (
              <div key={m.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] font-semibold text-purple-400">{label}</span>
                  <span className="text-[9px] text-slate-600">{formatTime(m.created_at)}</span>
                </div>
                <div className="max-w-[90%] rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed break-words bg-purple-950/60 text-purple-100 border border-purple-700/50 rounded-tr-none italic">
                  {m.body}
                </div>
              </div>
            )
          }

          const avatarUrl = avatarMap[m.sender_wallet?.toLowerCase() ?? ''] ?? null
          return (
            <div key={m.id} className={`flex gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
              {/* Avatar */}
              <div className="shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover ring-1 ring-slate-700"
                  />
                ) : (
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold ring-1 ring-slate-700 ${isMe ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-yellow-300'}`}>
                    {(m.sender_name || shortWallet(m.sender_wallet)).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
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
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {senderWallet && !canChat ? (
        <p className="text-center text-[10px] text-slate-500 pt-1 border-t border-slate-800 italic">
          {sessionStatus === 'setup' ? 'Chat opens when the lobby starts.' : 'Chat unavailable.'}
        </p>
      ) : senderWallet ? (
        <div className="flex flex-col gap-1 pt-1 border-t border-slate-800">
          {/* Whisper recipient row — only shown in whisper mode */}
          {whisperMode && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-purple-400 shrink-0">To:</span>
              {participants.length > 0 ? (
                <select
                  value={whisperTarget}
                  onChange={(e) => setWhisperTarget(e.target.value)}
                  className="flex-1 rounded border border-purple-700 bg-purple-950/60 px-1.5 py-0.5 text-[10px] text-purple-200 focus:outline-none focus:border-purple-500"
                >
                  {participants.map((p) => (
                    <option key={p.wallet} value={p.wallet}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <span className="text-[10px] text-slate-500 italic">No other players connected</span>
              )}
            </div>
          )}

          <div className="flex gap-1.5">
            {/* Whisper toggle */}
            <button
              title={whisperMode ? 'Cancel whisper' : 'Send a whisper'}
              onClick={toggleWhisperMode}
              className={`self-end rounded-md px-2 py-1.5 text-[13px] leading-none transition-colors ${
                whisperMode
                  ? 'bg-purple-800 text-purple-200 hover:bg-purple-700'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🤫
            </button>

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              maxLength={500}
              placeholder={whisperMode ? 'Whisper a secret… (Enter to send)' : 'Message the table… (Enter to send)'}
              className={`flex-1 resize-none rounded-md border px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 focus:outline-none ${
                whisperMode
                  ? 'border-purple-700 bg-purple-950/40 focus:border-purple-500'
                  : 'border-slate-700 bg-slate-900 focus:border-emerald-700'
              }`}
            />
            <button
              onClick={() => void send()}
              disabled={sending || !draft.trim() || (whisperMode && !whisperTarget)}
              className={`self-end rounded-md px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40 ${
                whisperMode
                  ? 'bg-purple-800 text-purple-200 hover:bg-purple-700'
                  : 'bg-emerald-800 text-emerald-200 hover:bg-emerald-700'
              }`}
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center text-[10px] text-slate-500 pt-1 border-t border-slate-800">
          Connect wallet to chat.
        </p>
      )}
    </div>
  )
}
