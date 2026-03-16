'use client'

import { useEffect } from 'react'

export default function CampaignError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Campaign Error]', error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h2 className="text-lg font-bold text-slate-100">Failed to load campaign</h2>
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
