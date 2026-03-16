'use client'

import { useEffect } from 'react'

export default function TableError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Table Error]', error)
  }, [error])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-center">
      <p className="text-3xl">🗺️</p>
      <h2 className="text-lg font-bold text-slate-100">Table failed to load</h2>
      <p className="text-sm text-slate-400">{error.message || 'An unexpected error occurred.'}</p>
      <button
        onClick={reset}
        className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
      >
        Retry
      </button>
    </div>
  )
}
