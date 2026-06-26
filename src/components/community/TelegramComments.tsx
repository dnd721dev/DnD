'use client'

import { useEffect, useRef } from 'react'

// Live Telegram-backed community chat via comments.app.
//
// Telegram doesn't allow embedding its native group chat in a website, so we
// use comments.app: a Telegram-account-backed widget where visitors "Log in
// with Telegram" and post messages that sync to the linked DND721 group.
//
// The widget is a <script> that injects its interactive iframe at the script's
// DOM position, so we append it into a container ref. The site id comes from
// NEXT_PUBLIC_COMMENTS_APP_ID (set after registering DND721 on comments.app);
// until that's set we render a graceful "being set up" fallback.

const WEBSITE_ID = process.env.NEXT_PUBLIC_COMMENTS_APP_ID ?? ''
const TELEGRAM_URL = 'https://t.me/DND721'

export function TelegramComments() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !WEBSITE_ID) return
    el.innerHTML = ''
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://comments.app/js/widget.js?3'
    s.setAttribute('data-comments-app-website', WEBSITE_ID)
    // One shared thread for the whole community, regardless of the page URL.
    s.setAttribute('data-page-id', 'dnd721-community')
    s.setAttribute('data-dark', '1')
    s.setAttribute('data-width', '100%')
    s.setAttribute('data-limit', '20')
    el.appendChild(s)
    return () => { el.innerHTML = '' }
  }, [])

  if (!WEBSITE_ID) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center">
        <p className="text-sm text-slate-300">Community chat is being set up.</p>
        <p className="mt-1 text-xs text-slate-500">
          In the meantime, jump into the conversation on Telegram.
        </p>
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Open in Telegram →
        </a>
        <p className="mt-3 text-[10px] text-slate-600">
          Admin: set <code className="text-slate-400">NEXT_PUBLIC_COMMENTS_APP_ID</code> to enable the embedded chat.
        </p>
      </div>
    )
  }

  // comments.app injects its iframe here; min-height avoids layout jump while it loads.
  return <div ref={containerRef} className="min-h-[420px]" />
}
