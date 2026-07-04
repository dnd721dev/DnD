// Voice FX — real-time Web Audio processing chain for the DM voice changer.
// Sits between getUserMedia and the LiveKit publish: raw mic → pitch shift →
// filters/distortion/echo → MediaStreamDestination → published track.
//
// The pitch shifter is the classic dual-delay "Jungle" granular technique
// (two crossfaded delay lines whose delay times ramp continuously): cheap,
// latency-friendly (~100 ms grain), and artifact-acceptable for tabletop
// character voices.
//
// Presets are pure data (FxParams) so adding a new voice — or an A/B variant
// so two NPCs of the same creature type sound distinct — is one line.

export type VoiceFxPreset = string

type BiquadSpec = {
  type: BiquadFilterType
  frequency: number
  Q?: number
  gain?: number
}

type FxParams = {
  /** Pitch shift in semitones. Negative = deeper. */
  semitones?: number
  /** Waveshaper drive; ~10 = grit, ~30 = heavy crunch. */
  distortion?: number
  /** Feedback echo. */
  echo?: { delay: number; feedback: number; wet: number }
  /** Biquad filter chain applied after pitch/distortion, in order. */
  filters?: BiquadSpec[]
  /** Output gain (default 0.9). */
  gain?: number
}

const PRESET_PARAMS: Record<string, FxParams> = {
  none: {},

  // ── Humanoid disguises ──────────────────────────────────────────────────────
  // Subtle shifts for voicing NPCs of the other sex or different builds.
  male_deep:   { semitones: -3, filters: [{ type: 'lowshelf', frequency: 250, gain: 5 }] },
  male_gruff:  { semitones: -2, distortion: 8, filters: [{ type: 'peaking', frequency: 900, Q: 1.2, gain: 3 }] },
  female_soft: { semitones: 4, filters: [{ type: 'highshelf', frequency: 3000, gain: 4 }, { type: 'highpass', frequency: 120 }] },
  female_sharp:{ semitones: 6, filters: [{ type: 'peaking', frequency: 2600, Q: 1.5, gain: 6 }, { type: 'highpass', frequency: 150 }] },
  elder:       { semitones: -1, filters: [{ type: 'peaking', frequency: 1600, Q: 1, gain: -5 }, { type: 'highshelf', frequency: 4000, gain: -4 }] },
  child:       { semitones: 7, filters: [{ type: 'highpass', frequency: 200 }] },

  // ── Monsters — two variants each so two NPCs of the same type differ ───────
  demon_a:     { semitones: -5, distortion: 18, filters: [{ type: 'lowshelf', frequency: 300, gain: 6 }] },
  demon_b:     { semitones: -7, distortion: 26, echo: { delay: 0.09, feedback: 0.2, wet: 0.3 }, filters: [{ type: 'lowshelf', frequency: 250, gain: 7 }] },
  giant_a:     { semitones: -7, filters: [{ type: 'lowpass', frequency: 1800 }, { type: 'lowshelf', frequency: 200, gain: 8 }] },
  giant_b:     { semitones: -9, distortion: 6, filters: [{ type: 'lowpass', frequency: 1400 }, { type: 'lowshelf', frequency: 180, gain: 9 }] },
  goblin_a:    { semitones: 5, filters: [{ type: 'peaking', frequency: 2200, Q: 2, gain: 8 }] },
  goblin_b:    { semitones: 7, distortion: 10, filters: [{ type: 'peaking', frequency: 2800, Q: 2.5, gain: 7 }, { type: 'highpass', frequency: 250 }] },
  ghost_a:     { semitones: -2, echo: { delay: 0.22, feedback: 0.35, wet: 0.5 }, filters: [{ type: 'highpass', frequency: 500 }] },
  ghost_b:     { semitones: -4, echo: { delay: 0.34, feedback: 0.45, wet: 0.6 }, filters: [{ type: 'highpass', frequency: 400 }, { type: 'lowpass', frequency: 3200 }] },
  construct_a: { distortion: 30, filters: [{ type: 'bandpass', frequency: 1400, Q: 1.2 }] },
  construct_b: { distortion: 22, echo: { delay: 0.06, feedback: 0.25, wet: 0.35 }, filters: [{ type: 'bandpass', frequency: 1000, Q: 1.6 }] },
}

export const VOICE_FX_PRESETS: { key: VoiceFxPreset; label: string; emoji: string; group: string }[] = [
  { key: 'none',         label: 'Natural voice',  emoji: '🎙', group: 'Off' },
  { key: 'male_deep',    label: 'Male — Deep',    emoji: '🧔', group: 'Humanoid' },
  { key: 'male_gruff',   label: 'Male — Gruff',   emoji: '🪓', group: 'Humanoid' },
  { key: 'female_soft',  label: 'Female — Soft',  emoji: '👩', group: 'Humanoid' },
  { key: 'female_sharp', label: 'Female — Sharp', emoji: '🧝‍♀️', group: 'Humanoid' },
  { key: 'elder',        label: 'Elder',          emoji: '🧓', group: 'Humanoid' },
  { key: 'child',        label: 'Child',          emoji: '🧒', group: 'Humanoid' },
  { key: 'demon_a',      label: 'Demon A',        emoji: '👹', group: 'Monster' },
  { key: 'demon_b',      label: 'Demon B — Archfiend', emoji: '🔥', group: 'Monster' },
  { key: 'giant_a',      label: 'Giant A',        emoji: '🗿', group: 'Monster' },
  { key: 'giant_b',      label: 'Giant B — Mountain', emoji: '⛰', group: 'Monster' },
  { key: 'goblin_a',     label: 'Goblin A',       emoji: '👺', group: 'Monster' },
  { key: 'goblin_b',     label: 'Goblin B — Shrieker', emoji: '🗡', group: 'Monster' },
  { key: 'ghost_a',      label: 'Ghost A',        emoji: '👻', group: 'Monster' },
  { key: 'ghost_b',      label: 'Ghost B — Wraith', emoji: '💀', group: 'Monster' },
  { key: 'construct_a',  label: 'Construct A',    emoji: '🤖', group: 'Monster' },
  { key: 'construct_b',  label: 'Construct B — Ancient', emoji: '⚙️', group: 'Monster' },
]

export type VoiceFxChain = {
  /** Processed audio track — publish this to LiveKit. */
  track: MediaStreamTrack
  /** Tear down the AudioContext and stop the raw mic stream. */
  cleanup: () => void
}

// ── Jungle-style granular pitch shifter ───────────────────────────────────────

const GRAIN_TIME = 0.100
const FADE_TIME = 0.050
const BUFFER_TIME = 0.100

function createDelayTimeBuffer(ctx: AudioContext, shiftUp: boolean): AudioBuffer {
  const length = Math.floor((GRAIN_TIME + BUFFER_TIME) * ctx.sampleRate)
  const active = Math.floor(GRAIN_TIME * ctx.sampleRate)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const p = buffer.getChannelData(0)
  // Linear ramp over the active grain: 0→1 to shift down, 1→0 to shift up.
  for (let i = 0; i < active; i++) {
    p[i] = shiftUp ? (active - i) / active : i / active
  }
  for (let i = active; i < length; i++) p[i] = 0
  return buffer
}

function createFadeBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor((GRAIN_TIME + BUFFER_TIME) * ctx.sampleRate)
  const active = Math.floor(GRAIN_TIME * ctx.sampleRate)
  const fade = Math.floor(FADE_TIME * ctx.sampleRate)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const p = buffer.getChannelData(0)
  for (let i = 0; i < active; i++) {
    if (i < fade) p[i] = Math.sqrt(i / fade)
    else if (i >= active - fade) p[i] = Math.sqrt(1 - (i - (active - fade)) / fade)
    else p[i] = 1
  }
  for (let i = active; i < length; i++) p[i] = 0
  return buffer
}

/**
 * Builds a granular pitch shifter between input and output.
 * @param semitones negative = deeper, positive = higher. 0 passes through.
 */
function buildPitchShifter(
  ctx: AudioContext,
  input: AudioNode,
  output: AudioNode,
  semitones: number,
) {
  if (semitones === 0) { input.connect(output); return }
  const ratio = Math.pow(2, semitones / 12)
  const shiftUp = ratio > 1
  // Delay ramp depth: how far the delay sweeps over one grain, scaled by the
  // pitch ratio distance from 1. |1 - ratio| * grainTime is the classic value.
  const depth = Math.abs(1 - ratio) * GRAIN_TIME

  const delayBuf = createDelayTimeBuffer(ctx, shiftUp)
  const fadeBuf = createFadeBuffer(ctx)
  const period = GRAIN_TIME + BUFFER_TIME

  for (const offset of [0, period / 2]) {
    const delay = ctx.createDelay(1)
    const modSrc = ctx.createBufferSource()
    modSrc.buffer = delayBuf
    modSrc.loop = true
    const modGain = ctx.createGain()
    modGain.gain.value = depth
    modSrc.connect(modGain)
    modGain.connect(delay.delayTime)

    const fadeSrc = ctx.createBufferSource()
    fadeSrc.buffer = fadeBuf
    fadeSrc.loop = true
    const fadeGain = ctx.createGain()
    fadeGain.gain.value = 0
    fadeSrc.connect(fadeGain.gain)

    input.connect(delay)
    delay.connect(fadeGain)
    fadeGain.connect(output)

    const t = ctx.currentTime + 0.05 + offset
    modSrc.start(t)
    fadeSrc.start(t)
  }
}

// ── Distortion curve ──────────────────────────────────────────────────────────

function makeDistortionCurve(amount: number): Float32Array {
  const k = amount
  const n = 44100
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x))
  }
  return curve
}

// ── Chain builder ─────────────────────────────────────────────────────────────

/**
 * Builds the full processing chain for a preset. Returns the processed track
 * and a cleanup fn. Caller owns publishing/unpublishing.
 */
export async function createVoiceFxChain(preset: VoiceFxPreset): Promise<VoiceFxChain> {
  const params = PRESET_PARAMS[preset] ?? {}
  const raw = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })
  const ctx = new AudioContext()
  const source = ctx.createMediaStreamSource(raw)
  const dest = ctx.createMediaStreamDestination()

  // Master output gain (keeps clipping in check after distortion stages)
  const master = ctx.createGain()
  master.gain.value = params.gain ?? 0.9
  master.connect(dest)

  // 1. Pitch shift (or passthrough)
  const afterPitch = ctx.createGain()
  buildPitchShifter(ctx, source, afterPitch, params.semitones ?? 0)

  // 2. Distortion
  let node: AudioNode = afterPitch
  if (params.distortion) {
    const shaper = ctx.createWaveShaper()
    shaper.curve = makeDistortionCurve(params.distortion) as any
    shaper.oversample = '2x'
    node.connect(shaper)
    node = shaper
  }

  // 3. Filter chain
  for (const spec of params.filters ?? []) {
    const f = ctx.createBiquadFilter()
    f.type = spec.type
    f.frequency.value = spec.frequency
    if (spec.Q != null) f.Q.value = spec.Q
    if (spec.gain != null) f.gain.value = spec.gain
    node.connect(f)
    node = f
  }

  // 4. Dry to master; echo (wet) in parallel
  node.connect(master)
  if (params.echo) {
    const echo = ctx.createDelay(2)
    echo.delayTime.value = params.echo.delay
    const feedback = ctx.createGain()
    feedback.gain.value = params.echo.feedback
    const wet = ctx.createGain()
    wet.gain.value = params.echo.wet
    node.connect(echo)
    echo.connect(feedback)
    feedback.connect(echo)
    echo.connect(wet)
    wet.connect(master)
  }

  const track = dest.stream.getAudioTracks()[0]
  return {
    track,
    cleanup: () => {
      try { track.stop() } catch { /* noop */ }
      for (const t of raw.getTracks()) { try { t.stop() } catch { /* noop */ } }
      void ctx.close().catch(() => {})
    },
  }
}
