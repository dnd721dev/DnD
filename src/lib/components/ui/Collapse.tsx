'use client'

import { useState } from 'react'

export default function Collapse({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-md border border-slate-700 bg-slate-900/70">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex justify-between items-center px-2 py-1 text-xs font-semibold text-slate-200 bg-slate-800"
      >
        <span>{title}</span>
        <span>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="p-2 text-xs text-slate-200">
          {children}
        </div>
      )}
    </div>
  )
}
