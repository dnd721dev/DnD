'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'

type ProfileRow = {
  wallet_address: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  location: string | null
  timezone: string | null
  twitter: string | null
  discord: string | null
  twitch: string | null
}

type CharacterAny = Record<string, any>

export default function PublicProfilePage() {
  const params = useParams()
  const rawUsername = params?.username as string | undefined
  const username = rawUsername ? decodeURIComponent(rawUsername) : undefined

  const { address, isConnected } = useAccount()

  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [characters, setCharacters] = useState<CharacterAny[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [charLoading, setCharLoading] = useState(false)
  const [charError, setCharError] = useState<string | null>(null)

  // Load profile by username
  useEffect(() => {
    if (!username) {
      setLoading(false)
      return
    }

    const loadProfile = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle<ProfileRow>()

      if (error) {
        console.error('Profile load error:', error)
        setError(error.message)
      } else {
        setProfile(data)
      }

      setLoading(false)
    }

    void loadProfile()
  }, [username])

  // Load all characters (we'll filter client-side by wallet)
  useEffect(() => {
    const loadCharacters = async () => {
      setCharLoading(true)
      setCharError(null)

      const { data, error } = await supabase
        .from('characters')
        .select('*')

      if (error) {
        console.error('Character load error:', error)
        setCharError(error.message)
      } else {
        setCharacters(data ?? [])
      }

      setCharLoading(false)
    }

    void loadCharacters()
  }, [])

  const isOwner =
    isConnected &&
    !!address &&
    !!profile &&
    address.toLowerCase() === profile.wallet_address.toLowerCase()

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-4">
        <p className="text-sm text-gray-400">Loading profile…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-4">
        <p className="text-sm text-red-300">
          Error loading profile: {error}
        </p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-4">
        <h1 className="text-2xl font-bold mb-2">Profile not found</h1>
        <p className="text-sm text-gray-400">
          No profile was found for{' '}
          <span className="font-mono">{username}</span>.
        </p>
        <Link
          href="/profile/edit"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
        >
          Create or edit your profile
        </Link>
      </div>
    )
  }

  const displayName = profile.display_name || profile.username
  const avatar = profile.avatar_url

  // Helpers to read character info from whatever fields exist
  const getCharName = (ch: CharacterAny) =>
    ch.name ||
    ch.character_name ||
    ch.title ||
    `Character ${ch.id ?? ''}`

  const getCharLevel = (ch: CharacterAny) =>
    ch.level ??
    ch.level_number ??
    ch.lvl ??
    1

  const getCharClass = (ch: CharacterAny) =>
    ch.class ||
    ch.class_name ||
    ch.character_class ||
    'Unknown class'

  const getCharAvatar = (ch: CharacterAny) =>
    ch.avatar_url ||
    ch.portrait_url ||
    '/default-character.png'

  const getCharWallet = (ch: CharacterAny): string | null =>
    ch.wallet_address ||
    ch.owner_wallet ||
    ch.player_wallet ||
    ch.wallet ||
    null

  // Only show characters whose wallet matches this profile's wallet
  const ownedCharacters = characters.filter((ch) => {
    const chWallet = getCharWallet(ch)
    if (!chWallet || !profile.wallet_address) return false
    return String(chWallet).toLowerCase() === profile.wallet_address.toLowerCase()
  })

  return (
    <div className="max-w-2xl mx-auto mt-10 p-4">
      {/* PROFILE HEADER */}
      <div className="flex items-start gap-4">
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            className="h-20 w-20 rounded-full object-cover border border-gray-700"
          />
        ) : (
          <div className="h-20 w-20 rounded-full border border-gray-700 bg-gray-900 flex items-center justify-center text-2xl font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <p className="text-sm text-gray-500">@{profile.username}</p>
            </div>

            {isOwner && (
              <Link
                href="/profile/edit"
                className="rounded-xl bg-indigo-600 px-3 py-1 text-xs font-semibold hover:bg-indigo-500"
              >
                Edit profile
              </Link>
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm text-gray-200 whitespace-pre-line">
              {profile.bio}
            </p>
          )}

          <div className="mt-4 space-y-1 text-sm text-gray-300">
            {profile.location && (
              <p>
                <span className="font-semibold">Location:</span>{' '}
                {profile.location}
              </p>
            )}
            {profile.timezone && (
              <p>
                <span className="font-semibold">Timezone:</span>{' '}
                {profile.timezone}
              </p>
            )}
          </div>

          <div className="mt-4 space-y-1 text-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Links
            </p>
            {profile.twitter && (
              <a
                href={`https://twitter.com/${profile.twitter.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="block text-indigo-400 hover:underline"
              >
                Twitter: {profile.twitter}
              </a>
            )}
            {profile.discord && (
              <p className="text-gray-300">
                Discord:{' '}
                <span className="font-mono">{profile.discord}</span>
              </p>
            )}
            {profile.twitch && (
              <a
                href={`https://twitch.tv/${profile.twitch}`}
                target="_blank"
                rel="noreferrer"
                className="block text-indigo-400 hover:underline"
              >
                Twitch: {profile.twitch}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* CHARACTERS SECTION */}
      <div className="mt-10 border-t border-gray-800 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Characters</h2>

          {isOwner && (
            <Link
              href="/characters/new"
              className="text-xs rounded-lg border border-indigo-500 px-3 py-1 font-semibold text-indigo-300 hover:bg-indigo-500/10"
            >
              + New Character
            </Link>
          )}
        </div>

        {charLoading && (
          <p className="text-sm text-gray-400">Loading characters…</p>
        )}

        {charError && (
          <p className="text-sm text-red-300 mb-2">
            Error loading characters: {charError}
          </p>
        )}

        {!charLoading && !charError && ownedCharacters.length === 0 && (
          <p className="text-sm text-gray-500">
            No characters associated with this wallet yet.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4">
          {ownedCharacters.map((ch) => (
            <Link
              key={ch.id}
              href={`/characters/${ch.id}`}
              className="flex items-center gap-4 p-3 rounded-lg border border-gray-800 hover:bg-gray-800/50 transition"
            >
              <img
                src={getCharAvatar(ch)}
                alt={getCharName(ch)}
                className="h-16 w-16 rounded-md object-cover border border-gray-700"
              />
              <div>
                <p className="text-lg font-bold">{getCharName(ch)}</p>
                <p className="text-xs text-gray-400">
                  {getCharClass(ch)} — Level {getCharLevel(ch)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
