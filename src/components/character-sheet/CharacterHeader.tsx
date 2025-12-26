import type { CharacterSheetData } from './types'
import type { DerivedStats } from './calc'

export function CharacterHeader({ c, d }: { c: CharacterSheetData; d: DerivedStats }) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-800 pb-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        {c.avatar_url ? (
          <img
            src={c.avatar_url}
            alt={c.name}
            className="h-24 w-24 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-slate-800 text-xs text-slate-400">
            No NFT
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold text-slate-50">{c.name}</h1>
          <p className="text-sm text-slate-300">
            {c.race ?? 'Unknown Race'} {c.main_job ? `• ${c.main_job}` : ''}{' '}
            {c.subclass ? `(${c.subclass})` : ''}
          </p>

          <p className="text-xs text-slate-400">
            Level {d.level} • AC {d.ac} • HP {d.hpCurrent}/{d.hpMax}
          </p>
        </div>
      </div>

      <div className="text-xs text-slate-400">
        <div>Alignment: {c.alignment ?? '—'}</div>
        <div>Background: {c.background ?? '—'}</div>
        <div>Wallet: {c.wallet_address ?? '—'}</div>
      </div>
    </header>
  )
}
