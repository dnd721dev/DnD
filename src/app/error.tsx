'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Global Error]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl">⚔️</p>
      <h2 className="text-xl font-bold text-slate-100">Something went wrong</h2>
      <p className="max-w-md text-sm text-slate-400">{error.message || 'An unexpected error occurred.'}</p>
      <button
        onClick={reset}
        className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
      >
        Try again
      </button>
    </div>
  )
}
