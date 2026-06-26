import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Telegram pushes each group update here. We mirror text messages into
// telegram_messages so the Community page can stream them live (read-only).
//
// Setup: a bot in the DND721 group with privacy mode OFF, registered via
//   setWebhook?url=<this route>&secret_token=<TELEGRAM_WEBHOOK_SECRET>
// Telegram echoes that secret in the X-Telegram-Bot-Api-Secret-Token header,
// which we verify so randoms can't POST fake messages.

export const runtime = 'nodejs'

const SECRET   = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
const CHAT_ID  = process.env.TELEGRAM_CHAT_ID ?? ''

function senderName(from: any): string {
  if (!from) return 'Member'
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ').trim()
  return name || from.username || 'Member'
}

// Short placeholder for non-text content so the feed stays readable.
function nonTextPlaceholder(msg: any): string | null {
  if (msg.photo)     return '[photo]'
  if (msg.sticker)   return msg.sticker.emoji ? `[sticker ${msg.sticker.emoji}]` : '[sticker]'
  if (msg.animation) return '[gif]'
  if (msg.video)     return '[video]'
  if (msg.voice)     return '[voice message]'
  if (msg.audio)     return '[audio]'
  if (msg.document)  return `[file: ${msg.document.file_name ?? 'document'}]`
  if (msg.poll)      return `[poll: ${msg.poll.question ?? ''}]`
  return null
}

export async function POST(req: NextRequest) {
  // Reject if the bridge isn't configured or the secret doesn't match.
  if (!SECRET || req.headers.get('x-telegram-bot-api-secret-token') !== SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let update: any
  try { update = await req.json() } catch { return NextResponse.json({ ok: true }) }

  // Only mirror brand-new messages (ignore edits/joins/etc.).
  const msg = update?.message ?? update?.channel_post ?? null
  if (!msg) return NextResponse.json({ ok: true })

  // Scope to the configured group only.
  if (CHAT_ID && String(msg.chat?.id) !== CHAT_ID) {
    return NextResponse.json({ ok: true })
  }

  const text = typeof msg.text === 'string' && msg.text.trim()
    ? msg.text.trim()
    : nonTextPlaceholder(msg)
  if (!text) return NextResponse.json({ ok: true }) // nothing displayable

  try {
    // Plain insert. The partial unique index (chat_id, tg_message_id) still
    // dedupes webhook retries — a duplicate raises 23505, which we ignore.
    // (We avoid upsert+onConflict here because Postgres can't use a *partial*
    // unique index as an ON CONFLICT arbiter, which silently failed the write.)
    const { error } = await supabaseAdmin()
      .from('telegram_messages')
      .insert({
        chat_id:       String(msg.chat?.id ?? CHAT_ID),
        tg_message_id: msg.message_id ?? null,
        sender_name:   senderName(msg.from ?? msg.sender_chat),
        text:          text.slice(0, 2000),
      })
    if (error && (error as any).code !== '23505') {
      console.error('[telegram/webhook] insert failed', error)
    }
  } catch (e) {
    console.error('[telegram/webhook] insert threw', e)
  }

  // Always 200 so Telegram doesn't retry-storm.
  return NextResponse.json({ ok: true })
}
