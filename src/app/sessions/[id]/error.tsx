'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Session Error]', error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h2 className="text-lg font-bold text-slate-100">Failed to load session</h2>
      <p className="text-sm text-slate-400">{error.message || 'An unexpected error occurred.'}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Retry
        </button>
        <Link
          href="/campaigns"
          className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600"
        >
          Back to campaigns
        </Link>
      </div>
    </div>
  )
}
