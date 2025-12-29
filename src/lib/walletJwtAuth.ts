// src/lib/walletJwtAuth.ts
export const DND721_JWT_STORAGE_KEY = 'dnd721_supabase_jwt'

export function getStoredJwt() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(DND721_JWT_STORAGE_KEY)
}

export function setStoredJwt(token: string) {
  localStorage.setItem(DND721_JWT_STORAGE_KEY, token)
}

export function clearStoredJwt() {
  localStorage.removeItem(DND721_JWT_STORAGE_KEY)
}
