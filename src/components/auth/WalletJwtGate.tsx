'use client'

import { useEffect, useRef } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { getStoredJwt, setStoredJwt, clearStoredJwt } from '@/lib/walletJwtAuth'
import { supabase } from '@/lib/supabase'

/** How many seconds before expiry we proactively refresh (1 hour) */
const REFRESH_BEFORE_EXPIRY_S = 60 * 60

/**
 * How long to wait before treating a disconnect as real.
 * wagmi briefly emits isConnected=false on every page load/refresh while
 * re-establishing the wallet connection. Without this debounce, the gate
 * immediately clears auth state, causing "session not found" loops.
 */
const DISCONNECT_DEBOUNCE_MS = 3000

/** sessionStorage key for mobile auth state that must survive page reloads */
const AUTH_ATTEMPT_KEY = 'dnd721_auth_attempt'

/** Max age of a saved auth attempt (25 min — slightly longer than nonce TTL) */
const AUTH_ATTEMPT_MAX_AGE_MS = 25 * 60 * 1000

interface AuthAttempt {
  wallet: string
  nonce: string
  signature?: string
  phase: 'nonce_fetched' | 'signing' | 'signing_done'
  ts: number
}

function getAuthAttempt(wallet: string): AuthAttempt | null {
  try {
    const raw = sessionStorage.getItem(AUTH_ATTEMPT_KEY)
    if (!raw) return null
    const attempt = JSON.parse(raw) as AuthAttempt
    if (attempt.wallet !== wallet) return null
    if (Date.now() - attempt.ts > AUTH_ATTEMPT_MAX_AGE_MS) return null
    return attempt
  } catch { return null }
}

function saveAuthAttempt(attempt: AuthAttempt) {
  try { sessionStorage.setItem(AUTH_ATTEMPT_KEY, JSON.stringify(attempt)) } catch {}
}

function clearAuthAttempt() {
  try { sessionStorage.removeItem(AUTH_ATTEMPT_KEY) } catch {}
}

function getJwtExp(token: string): number | null {
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof decoded.exp === 'number' ? decoded.exp : null
  } catch {
    return null
  }
}

function isTokenFresh(token: string): boolean {
  const exp = getJwtExp(token)
  if (!exp) return false
  return exp - Math.floor(Date.now() / 1000) > REFRESH_BEFORE_EXPIRY_S
}

function norm(a?: string | null) {
  return (a ?? '').trim().toLowerCase()
}

export default function WalletJwtGate() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const authInProgress = useRef<string>('') // wallet currently being authed
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleRefresh(wallet: string, token: string) {
    const exp = getJwtExp(token)
    if (!exp) return

    const nowS = Math.floor(Date.now() / 1000)
    const refreshInMs = Math.max(0, (exp - nowS - REFRESH_BEFORE_EXPIRY_S) * 1000)

    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      void mintJwt(wallet)
    }, refreshInMs)
  }

  async function mintJwt(wallet: string) {
    if (authInProgress.current === wallet) return
    authInProgress.current = wallet

    try {
      // --- Check for an auth attempt that survived a page reload ---
      // On mobile, the wallet app deep-links back to the app URL which reloads the
      // page and kills the pending signMessageAsync promise. We persist each stage
      // to sessionStorage so we can resume without fetching a new nonce (which
      // would overwrite the server's httpOnly cookie and cause a 401 nonce mismatch).
      const pending = getAuthAttempt(wallet)

      let nonce: string
      let signature: string | undefined

      if (pending?.phase === 'signing_done' && pending.signature) {
        // We have a complete signature from before the page reload — skip straight to login.
        nonce = pending.nonce
        signature = pending.signature
      } else if (pending?.phase === 'nonce_fetched' || pending?.phase === 'signing') {
        // We have a nonce (server cookie still holds it) but lost the signature.
        // Reuse the nonce — do NOT fetch a new one or the cookie gets overwritten.
        nonce = pending.nonce
      } else {
        // Fresh start — fetch a new nonce from the server.
        const nonceRes = await fetch('/api/auth/nonce')
        if (!nonceRes.ok) throw new Error('Failed to fetch nonce')
        const data = await nonceRes.json()
        nonce = data.nonce
        saveAuthAttempt({ wallet, nonce, phase: 'nonce_fetched', ts: Date.now() })
      }

      if (!signature) {
        const message = `DnD721 Login\nWallet: ${wallet}\nNonce: ${nonce}`
        saveAuthAttempt({ wallet, nonce, phase: 'signing', ts: Date.now() })

        signature = await signMessageAsync({ message })

        // Save the signature immediately — the wallet app's deep-link redirect fires
        // nearly simultaneously with the signature arriving via the WalletConnect relay.
        // JavaScript is single-threaded, so this line runs before any page navigation
        // can interrupt it, letting the next page load skip straight to the login POST.
        saveAuthAttempt({ wallet, nonce, signature, phase: 'signing_done', ts: Date.now() })
      }

      // POST to exchange nonce + signature for a JWT
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet, signature, nonce }),
      })

      if (!loginRes.ok) {
        const body = await loginRes.json().catch(() => ({}))
        console.warn('[WalletJwtGate] login failed', body)
        // Nonce mismatch means the cookie was somehow overwritten — clear saved
        // attempt so the next try starts completely fresh.
        if (loginRes.status === 401) clearAuthAttempt()
        return
      }

      const { token } = await loginRes.json()
      if (token) {
        setStoredJwt(token)
        clearAuthAttempt() // auth complete — no longer need the saved attempt
        try { localStorage.setItem('dnd721_wallet', wallet) } catch {}

        // Inject into Supabase so realtime WebSocket gets proper auth context.
        // The JWT is signed with SUPABASE_JWT_SECRET and carries role=authenticated,
        // so Supabase accepts it for both REST and realtime channels.
        void supabase.auth.setSession({ access_token: token, refresh_token: token })

        scheduleRefresh(wallet, token)
      }
    } catch (e) {
      // User cancelled signature or network error — not a fatal error.
      // Leave the saved auth attempt intact so the next page load can resume.
      console.warn('[WalletJwtGate] auth cancelled or failed', e)
    } finally {
      authInProgress.current = ''
    }
  }

  useEffect(() => {
    const wallet = norm(address)

    if (!isConnected || !wallet) {
      // Debounce: wagmi briefly emits isConnected=false on every page refresh while
      // re-establishing the connection. Don't clear auth state immediately — if the
      // same wallet reconnects within DISCONNECT_DEBOUNCE_MS, cancel the clear.
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current)
      disconnectTimer.current = setTimeout(() => {
        // Real disconnect confirmed. Clear JWT (sensitive) but intentionally leave
        // dnd721_wallet in localStorage — the Supabase fetch interceptor uses it as
        // the x-wallet-address header, and removing it during any in-flight queries
        // (e.g. session loading) causes "Session not found" errors.
        clearStoredJwt()
        clearAuthAttempt()
        void supabase.auth.signOut()
        if (refreshTimer.current) clearTimeout(refreshTimer.current)
      }, DISCONNECT_DEBOUNCE_MS)
      return
    }

    // Connected: cancel any pending disconnect debounce
    if (disconnectTimer.current) {
      clearTimeout(disconnectTimer.current)
      disconnectTimer.current = null
    }

    // Always keep wallet in localStorage for the Supabase fetch interceptor
    try { localStorage.setItem('dnd721_wallet', wallet) } catch {}

    // Check if existing token is still fresh for this wallet
    const existing = (getStoredJwt() ?? '').trim()
    const existingIsForThisWallet = (() => {
      try {
        const [, payload] = existing.split('.')
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
        return decoded.wallet_address === wallet
      } catch { return false }
    })()

    if (existing && existingIsForThisWallet && isTokenFresh(existing)) {
      scheduleRefresh(wallet, existing)
      // Re-inject into Supabase in case the session was lost (e.g. new tab, refresh)
      void supabase.auth.setSession({ access_token: existing, refresh_token: existing })
      return
    }

    // Token missing, stale, or for a different wallet — mint a new one
    clearStoredJwt()
    void mintJwt(wallet)

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected])

  return null
}
