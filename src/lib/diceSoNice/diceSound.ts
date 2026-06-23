// Asset-free dice "clack" sound, synthesized with the WebAudio API.
//
// We avoid shipping audio files: each impact is a short filtered noise burst
// with a fast decay, lightly randomized in pitch/duration so repeated hits
// don't sound mechanical. The AudioContext is created lazily and resumed on
// first use (a roll is a user gesture, satisfying autoplay policies).

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
let lastPlay = 0

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.5
    masterGain.connect(ctx.destination)

    // 0.3s of white noise we slice impulses out of.
    const len = Math.floor(ctx.sampleRate * 0.3)
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Set master volume 0–1. */
export function setDiceVolume(vol: number) {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, vol))
}

/**
 * Play one impact clack. `intensity` (0–1) scales loudness/brightness so a
 * hard slam reads louder than a gentle tumble. Throttled to avoid a buzz when
 * many collisions land in the same frame.
 */
export function playDiceImpact(intensity = 0.6) {
  const c = ensureContext()
  if (!c || !masterGain || !noiseBuffer) return

  const now = c.currentTime
  // Throttle: at most ~1 clack per 45ms.
  if (now - lastPlay < 0.045) return
  lastPlay = now

  const amp = Math.max(0.05, Math.min(1, intensity))
  const dur = 0.045 + Math.random() * 0.05

  const src = c.createBufferSource()
  src.buffer = noiseBuffer
  src.playbackRate.value = 0.85 + Math.random() * 0.5

  // Band-pass gives it a "tok" wooden/plastic knock rather than a hiss.
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1400 + Math.random() * 1800 + amp * 1200
  bp.Q.value = 0.8 + Math.random() * 0.8

  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, now)
  env.gain.exponentialRampToValueAtTime(0.6 * amp, now + 0.004)
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur)

  src.connect(bp)
  bp.connect(env)
  env.connect(masterGain)

  src.start(now)
  src.stop(now + dur + 0.02)
}
