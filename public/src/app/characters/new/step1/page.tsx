'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { loadDraft, saveDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import { RACE_LIST, type RaceKey } from '@/lib/races'

type NftItem = {
  contract: string
  tokenId: string
  metadata: any
}

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

const KNOWN_CLASSES = [
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'sorcerer',
  'warlock',
  'wizard',
] as const

type ClassKey = (typeof KNOWN_CLASSES)[number]

const normalize = (s: string) => String(s).toLowerCase().trim()

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

export default function NewCharacterStep1Page() {
  const router = useRouter()
  const { address } = useAccount()

  const [draft, setDraft] = useState<CharacterDraft | null>(null)
  const [nfts, setNfts] = useState<NftItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [loadingNFTs, setLoadingNFTs] = useState(false)
  const [nftError, setNftError] = useState<string | null>(null)

  // Hydration safety
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Load existing draft
  useEffect(() => {
    const existing = loadDraft()
    setDraft(existing)
  }, [])

  // Fetch NFTs when wallet connects
  useEffect(() => {
    if (!mounted) return
    if (!address) {
      setNfts([])
      setSelectedIndex(null)
      return
    }

    const fetchNfts = async () => {
      try {
        setLoadingNFTs(true)
        setNftError(null)

        const res = await fetch(`/api/nft?owner=${address}`)
        if (!res.ok) {
          throw new Error('Failed to fetch NFTs')
        }

        const data = await res.json()
        console.log('NFT API response:', data)

        const list: NftItem[] = (data?.items ?? []).map((it: any) => ({
          contract: it.contract,
          tokenId: it.tokenId,
          metadata: it.metadata,
        }))

        setNfts(list)

        if (draft?.nft_contract && draft?.nft_token_id) {
          const idx = list.findIndex(
            (n) =>
              n.contract === draft.nft_contract &&
              n.tokenId === draft.nft_token_id
          )
          if (idx >= 0) setSelectedIndex(idx)
        }
      } catch (err: any) {
        console.error(err)
        setNftError(err?.message || 'Failed to load NFTs')
      } finally {
        setLoadingNFTs(false)
      }
    }

    fetchNfts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, address])

  function ensureBaseDraft(d: CharacterDraft | null): CharacterDraft {
    if (d) {
      return {
        baseAbilities: {
          str: 10,
          dex: 10,
          con: 10,
          int: 10,
          wis: 10,
          cha: 10,
          ...(d.baseAbilities ?? {}),
        },
        abilityBonuses: {
          str: 0,
          dex: 0,
          con: 0,
          int: 0,
          wis: 0,
          cha: 0,
          ...(d.abilityBonuses ?? {}),
        },
        level: d.level ?? 1,
        ...d,
      }
    }

    const base: CharacterDraft = {
      level: 1,
      baseAbilities: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
      },
      abilityBonuses: {
        str: 0,
        dex: 0,
        con: 0,
        int: 0,
        wis: 0,
        cha: 0,
      },
    }
    setDraft(base)
    saveDraft(base)
    return base
  }

  // Map NFT metadata into draft fields (class, race, stats, avatar, name)
  function mapNftToDraft(metadata: any, baseDraft: CharacterDraft): CharacterDraft {
    if (!metadata) return baseDraft

    // Start from a clean base each time
    let updated = ensureBaseDraft(baseDraft)

    // ❗ Reset class, race, and baseAbilities so each NFT fully overwrites them
    updated = {
      ...updated,
      classKey: undefined,
      raceKey: undefined,
      baseAbilities: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
      },
    }

    const traits = metadata.attributes || metadata.traits || []

    // Name (we'll overwrite to follow the NFT; remove this if you want manual names to win)
    const metaName = metadata.name || metadata.title
    if (metaName) {
      updated = { ...updated, name: String(metaName) }
    }

    // Avatar image
    const img =
      metadata.image ||
      metadata.image_url ||
      metadata.imageUri ||
      metadata.imageURI

    if (img) {
      updated = { ...updated, avatar_url: String(img) }
    }

    const abilityMap: Record<string, AbilityKey> = {
      str: 'str',
      strength: 'str',
      dex: 'dex',
      dexterity: 'dex',
      con: 'con',
      constitution: 'con',
      int: 'int',
      intelligence: 'int',
      wis: 'wis',
      wisdom: 'wis',
      cha: 'cha',
      charisma: 'cha',
    }

    for (const t of traits) {
      if (!t.trait_type) continue

      const label = normalize(t.trait_type)
      const rawValue = t.value ?? ''
      const value = String(rawValue)
      const valueNorm = normalize(value)

      // CLASS mapping (Rogue, Warlock, etc.) – always overwrite for the new NFT
      if (['class', 'job', 'role'].includes(label)) {
        const cls = KNOWN_CLASSES.find((c) => valueNorm.includes(c))
        if (cls) {
          updated = { ...updated, classKey: cls as ClassKey }
        }
      }

      // RACE mapping (Halfling, Tiefling, etc.) – always overwrite for the new NFT
      if (['race', 'species', 'ancestry'].includes(label)) {
        let race = RACE_LIST.find((r) => normalize(r.name) === valueNorm)

        if (!race) {
          race = RACE_LIST.find(
            (r) =>
              normalize(r.name).includes(valueNorm) ||
              valueNorm.includes(normalize(r.name))
          )
        }

        if (race) {
          updated = { ...updated, raceKey: race.key as RaceKey }
        } else {
          updated = { ...updated, raceKey: value }
        }
      }

      // Ability scores (CHA, DEX, etc.)
      const abilityKey = abilityMap[label]
      if (abilityKey) {
        const n = Number(rawValue)
        if (!isNaN(n)) {
          updated = {
            ...updated,
            baseAbilities: {
              ...updated.baseAbilities!,
              [abilityKey]: n,
            },
          }
        }
      }
    }

    return updated
  }

  function handleSelectNft(index: number) {
    const current = ensureBaseDraft(draft)
    setSelectedIndex(index)

    const nft = nfts[index]
    if (!nft) return

    let updated: CharacterDraft = {
      ...current,
      nft_contract: nft.contract,
      nft_token_id: nft.tokenId,
    }

    updated = mapNftToDraft(nft.metadata, updated)

    setDraft(updated)
    saveDraft(updated)
  }

  function handleSkip() {
    const base = ensureBaseDraft(draft)
    setDraft(base)
    saveDraft(base)
    router.push('/characters/new/step2')
  }

  function handleNext() {
    const base = ensureBaseDraft(draft)
    setDraft(base)
    saveDraft(base)
    router.push('/characters/new/step2')
  }

  const abilityLabels: Record<AbilityKey, string> = {
    str: 'STR',
    dex: 'DEX',
    con: 'CON',
    int: 'INT',
    wis: 'WIS',
    cha: 'CHA',
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-white">
          Step 1 — Link Your DND721 NFT
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Select an NFT to auto-fill your class, race, and ability scores — or skip to build manually.
        </p>
      </div>

      {!mounted && (
        <div className="text-xs text-slate-400">Loading wallet state…</div>
      )}

      {mounted && !address && (
        <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          Connect your wallet to load your DND721 NFTs. You can still continue
          without one.
        </div>
      )}

      {mounted && address && (
        <>
          {loadingNFTs && (
            <div className="text-xs text-slate-300">
              Loading NFTs for{' '}
              <span className="font-mono text-cyan-300">{address}</span>…
            </div>
          )}

          {nftError && (
            <div className="rounded-md border border-red-500 bg-red-900/40 px-3 py-2 text-xs text-red-100">
              {nftError}
            </div>
          )}

          {!loadingNFTs && !nftError && nfts.length === 0 && (
            <div className="text-xs text-slate-400">
              No NFTs found for this wallet. You can still proceed without
              linking one.
            </div>
          )}

          {nfts.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {nfts.map((nft, idx) => {
                const img =
                  nft.metadata?.image ||
                  nft.metadata?.image_url ||
                  nft.metadata?.imageUri ||
                  nft.metadata?.imageURI
                const selected = selectedIndex === idx

                return (
                  <button
                    key={`${nft.contract}-${nft.tokenId}-${idx}`}
                    type="button"
                    onClick={() => handleSelectNft(idx)}
                    className={`relative rounded-xl p-3 border flex flex-col gap-2 transition ${
                      selected
                        ? 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_25px_rgba(34,211,238,0.6)]'
                        : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'
                    }`}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt="NFT"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-32 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 text-[11px]">
                        No Image
                      </div>
                    )}

                    <div className="space-y-0.5 text-left">
                      <p className="text-xs font-semibold text-white truncate">
                        {nft.metadata?.name || `Token #${nft.tokenId}`}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {nft.contract}
                      </p>
                    </div>

                    {selected && (
                      <div className="absolute -top-1 -right-1 rounded-full bg-cyan-500 text-slate-950 text-[10px] px-1.5 py-0.5 font-bold">
                        SELECTED
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Mapped-from-NFT preview */}
      {draft && draft.baseAbilities && (
        <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Mapped From NFT
              </p>
              <p className="text-sm font-semibold text-white">
                {draft.name || 'Unnamed Hero'}
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-[11px] text-slate-400">
                Class:{' '}
                <span className="font-semibold text-cyan-300">
                  {draft.classKey || '—'}
                </span>
              </p>
              <p className="text-[11px] text-slate-400">
                Race:{' '}
                <span className="font-semibold text-cyan-300">
                  {draft.raceKey || '—'}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {ABILITY_KEYS.map((key) => {
              const score = draft.baseAbilities?.[key] ?? 10
              const mod = abilityMod(score)
              const sign = mod >= 0 ? '+' : ''
              return (
                <div
                  key={key}
                  className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-center"
                >
                  <div className="text-[10px] font-semibold text-slate-400">
                    {abilityLabels[key]}
                  </div>
                  <div className="text-sm font-bold text-white leading-tight">
                    {score}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {sign}
                    {mod}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-[11px] text-slate-500">
            These values will flow directly into{' '}
            <span className="font-semibold text-slate-300">Step 2</span> (class
            &amp; race) and{' '}
            <span className="font-semibold text-slate-300">Step 3</span>{' '}
            (abilities &amp; skills).
          </p>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs md:text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
        >
          Skip for now
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs md:text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.55)] transition"
        >
          Next: Basics
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}
