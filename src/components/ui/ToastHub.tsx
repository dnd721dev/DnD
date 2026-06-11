'use client'

// Lightweight toast notification surface. One ToastHub instance lives at the
// root of the app (mounted in app/layout.tsx). Anywhere in a client component
// you can call `toast.error('…')` / `toast.success('…')` / `toast.info('…')`
// to surface a transient pill in the top-right.
//
// Implementation: a module-level event bus (window CustomEvent) keeps the API
// dead-simple and avoids the context-provider boilerplate React's context
// would require. ToastHub subscribes to the event; emitters are one-liners.

import { useEffect, useState } from 'react'

type ToastKind = 'success' | 'error' | 'info'

type ToastPayload = {
  id: number
  kind: ToastKind
  message: string
}

const EVENT = 'dnd721-toast'
let nextId = 1

function emit(kind: ToastKind, message: string, durationMs = 4000) {
  if (typeof window === 'undefined') return
  const id = nextId++
  window.dispatchEvent(new CustomEvent<ToastPayload & { durationMs: number }>(EVENT, {
    detail: { id, kind, message, durationMs },
  }))
}

export const toast = {
  success: (msg: string, ms?: number) => emit('success', msg, ms),
  error:   (msg: string, ms?: number) => emit('error',   msg, ms ?? 6000),
  info:    (msg: string, ms?: number) => emit('info',    msg, ms),
}

export function ToastHub() {
  const [toasts, setToasts] = useState<ToastPayload[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onEmit = (ev: Event) => {
      const detail = (ev as CustomEvent<ToastPayload & { durationMs: number }>).detail
      if (!detail) return
      setToasts((prev) => [...prev, detail])
      const ms = detail.durationMs ?? 4000
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id))
      }, ms)
    }
    window.addEventListener(EVENT, onEmit)
    return () => window.removeEventListener(EVENT, onEmit)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[1000] flex w-72 max-w-[90vw] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-lg border px-3 py-2 text-[11px] shadow-lg backdrop-blur-md transition ${
            t.kind === 'error'
              ? 'border-red-700/60 bg-red-950/80 text-red-100'
              : t.kind === 'success'
                ? 'border-emerald-700/60 bg-emerald-950/80 text-emerald-100'
                : 'border-slate-700/60 bg-slate-950/85 text-slate-100'
          }`}
          role="status"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 leading-relaxed">
              {t.kind === 'error' && <span className="mr-1">⚠</span>}
              {t.kind === 'success' && <span className="mr-1">✓</span>}
              {t.kind === 'info' && <span className="mr-1">ℹ</span>}
              {t.message}
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-slate-400 hover:text-slate-200"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
