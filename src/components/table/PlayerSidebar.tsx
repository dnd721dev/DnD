'use client'

import React from 'react'
import Link from 'next/link'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

type PlayerCharacter = {
  id: string
  name?: string | null
}

type PlayerSidebarProps = {
  address: string | null
  characters: PlayerCharacter[]
  selectedCharacter: PlayerCharacter | null
  selectedCharacterId: string | null
  charsError: string | null
  charsLoading: boolean
  onSelectCharacter: (id: string) => void
  onAbilityCheck: (abilityKey: AbilityKey, label: string) => void
  onInitiative: () => void
}

export function PlayerSidebar({
  address,
  characters,
  selectedCharacter,
  selectedCharacterId,
  charsError,
  charsLoading,
  onSelectCharacter,
  onAbilityCheck,
  onInitiative,
}: PlayerSidebarProps) {
  return (
    <aside className="hidden w-80 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 md:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">
          {selectedCharacter ? 'Character Sheet' : 'Choose Your Character'}
        </h2>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
          Player
        </span>
      </div>

      {charsError && <p className="text-xs text-red-400">{charsError}</p>}

      {!address && (
        <p className="text-xs text-amber-400">
          Connect your wallet to pick a character for this session.
        </p>
      )}

      {/* Character Selection View */}
      {address && !selectedCharacter && (
        <>
          <p className="text-[11px] text-slate-400">
            Select which of your DND721 characters you&apos;re playing in this
            session.
          </p>

          {charsLoading && (
            <p className="text-xs text-slate-400">Loading your characters…</p>
          )}

          {!charsLoading && characters.length === 0 && (
            <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/60 p-2">
              <p className="text-xs text-slate-300">
                You don&apos;t have any characters yet.
              </p>
              <Link
                href="/characters/new"
                className="inline-flex rounded-md bg-sky-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-500"
              >
                Create a Character
              </Link>
            </div>
          )}

          {!charsLoading && characters.length > 0 && (
            <div className="mt-1 space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
              <p className="text-[11px] font-semibold text-slate-200">
                Your Characters
              </p>
              <div className="flex flex-col gap-1.5">
                {characters.map((char) => {
                  const isSelected = selectedCharacterId === char.id
                  const name =
                    (char.name &&
                      String(char.name).trim().length > 0 &&
                      String(char.name)) ||
                    'Unnamed Character'

                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => onSelectCharacter(char.id)}
                      className={`w-full rounded-md border px-2 py-1.5 text-left text-xs ${
                        isSelected
                          ? 'border-sky-500 bg-sky-900/40 text-sky-50'
                          : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-500'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Character Sheet View */}
      {address && selectedCharacter && selectedCharacterId && (
        <div className="mt-1 space-y-3">
          {/* Header & Change Button */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-200">
                Using Character
              </p>
              <p className="text-xs text-slate-100">
                {selectedCharacter.name || 'Unnamed Character'}
              </p>
            </div>
            <button
              type="button"
              // Passing empty string tells parent to clear selection
              onClick={() => onSelectCharacter('')}
              className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-sky-500"
            >
              Change
            </button>
          </div>

          {/* Embedded Character Sheet */}
          <div className="h-72 rounded-md border border-slate-800 bg-slate-950/80 overflow-hidden">
            <iframe
              key={selectedCharacterId ?? 'active-sheet'}
              src={`/characters/${selectedCharacterId}`}
              className="h-full w-full border-0"
              title="Character Sheet"
            />
          </div>

          {/* Quick Rolls */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-200">
              Quick Rolls
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onAbilityCheck('str', 'STR Check')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-sky-500"
              >
                STR Check
              </button>
              <button
                type="button"
                onClick={() => onAbilityCheck('dex', 'DEX Check')}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-sky-500"
              >
                DEX Check
              </button>
              <button
                type="button"
                onClick={onInitiative}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-sky-500"
              >
                Initiative
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Rolls use your character&apos;s ability modifiers and are logged
              in the table dice log.
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
