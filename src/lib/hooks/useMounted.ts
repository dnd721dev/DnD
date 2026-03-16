'use client'

import { useEffect, useState } from 'react'

/** Returns true once the component has mounted on the client.
 *  Use this to prevent hydration mismatches when reading browser-only APIs (localStorage, window, etc.). */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
