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
      <p className="eyebrow">A critical miss</p>
      <h2 className="page-title text-2xl">Something went wrong</h2>
      <p className="max-w-md text-sm" style={{ color: 'var(--text-mid)' }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button onClick={reset} className="btn btn-primary">
        Try again
      </button>
    </div>
  )
}
