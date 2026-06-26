// Server-side helper to post a message into the DND721 Telegram group via the
// bot. Best-effort: never throws, returns { ok:false } when unconfigured or on
// API failure, so callers (e.g. invite creation) don't fail because Telegram is
// down. Uses plain text (no parse_mode) so user-supplied content can't break or
// inject Telegram markup.

const API = 'https://api.telegram.org'

export async function sendTelegramMessage(
  text: string,
  opts: { disableLinkPreview?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.error('[telegram] not configured — missing', !token ? 'TELEGRAM_BOT_TOKEN' : 'TELEGRAM_CHAT_ID')
    return { ok: false, error: 'Telegram not configured' }
  }

  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: opts.disableLinkPreview ?? false,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[telegram] sendMessage failed', res.status, body.slice(0, 300))
      return { ok: false, error: `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e: any) {
    console.error('[telegram] sendMessage threw', e?.message ?? e)
    return { ok: false, error: e?.message ?? 'network error' }
  }
}
