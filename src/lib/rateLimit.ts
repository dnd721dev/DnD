/**
 * Simple in-memory rate limiter.
 * Works per-process (not distributed). For a single-server or Vercel serverless deployment
 * each function instance has its own map, so limits are per-instance rather than global.
 * Good enough to block accidental or single-client abuse.
 */

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

interface RateLimitOptions {
  /** Max requests allowed within the window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

/**
 * Returns { ok: true } if the request is within limits, or
 * { ok: false, retryAfter: seconds } if the limit has been exceeded.
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { ok: true }
}

/** Build a key from an IP address (or fallback) + optional route segment */
export function rateLimitKey(req: Request, suffix = ''): string {
  const forwarded = (req.headers as any).get?.('x-forwarded-for') ?? ''
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : '').trim() || 'unknown'
  return suffix ? `${ip}:${suffix}` : ip
}
