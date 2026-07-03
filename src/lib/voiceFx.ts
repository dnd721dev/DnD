// Voice FX — real-time Web Audio processing chain for the DM voice changer.
// Sits between getUserMedia and the LiveKit publish: raw mic → pitch shift →
// filters/distortion/echo → MediaStreamDestination → published track.
//
// The pitch shifter is the classic dual-delay "Jungle" granular technique
// (two crossfaded delay lines whose delay times ramp continuously): cheap,
// latency-friendly (~100 ms grain), and artifact-acceptable for tabletop
// character voices.

export type VoiceFxPreset =
  | 'none'
  | 'demon'      // deep + growl distortion
  | 'goblin'     // pitched up, nasal
  | 'ghost'      // airy, echoing
  | 'giant'      // very deep, muffled boom
  | 'construct'  // robotic radio band + crunch

export const VOICE_FX_PRESETS: { key: VoiceFxPreset; label: string; emoji: string }[] = [
  { key: 'none',      label: 'Natural voice', emoji: '🎙' },
  { key: 'demon',     label: 'Demon',         emoji: '👹' },
  { key: 'giant',     label: 'Giant',         emoji: '🗿' },
  { key: 'goblin',    label: 'Goblin',        emoji: '👺' },
  { key: 'ghost',     label: 'Ghost',         emoji: '👻' },
  { key: 'construct', label: 'Construct',     emoji: '🤖' },
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

// ── Preset chains ─────────────────────────────────────────────────────────────

/**
 * Builds the full processing chain for a preset. Returns the processed track
 * and a cleanup fn. Caller owns publishing/unpublishing.
 */
export async function createVoiceFxChain(preset: VoiceFxPreset): Promise<VoiceFxChain> {
  const raw = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })
  const ctx = new AudioContext()
  const source = ctx.createMediaStreamSource(raw)
  const dest = ctx.createMediaStreamDestination()

  // Master output gain (keeps clipping in check after distortion stages)
  const master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(dest)

  switch (preset) {
    case 'demon': {
      // Pitch −5 semitones → growl distortion → low-mid emphasis
      const mid = ctx.createGain()
      buildPitchShifter(ctx, source, mid, -5)
      const shaper = ctx.createWaveShaper()
      shaper.curve = makeDistortionCurve(18) as any
      shaper.oversample = '2x'
      const lowshelf = ctx.createBiquadFilter()
      lowshelf.type = 'lowshelf'
      lowshelf.frequency.value = 300
      lowshelf.gain.value = 6
      mid.connect(shaper)
      shaper.connect(lowshelf)
      lowshelf.connect(master)
      break
    }
    case 'giant': {
      // Pitch −7 → heavy lowpass boom
      const mid = ctx.createGain()
      buildPitchShifter(ctx, source, mid, -7)
      const lowpass = ctx.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 1800
      const lowshelf = ctx.createBiquadFilter()
      lowshelf.type = 'lowshelf'
      lowshelf.frequency.value = 200
      lowshelf.gain.value = 8
      mid.connect(lowpass)
      lowpass.connect(lowshelf)
      lowshelf.connect(master)
      break
    }
    case 'goblin': {
      // Pitch +5 → nasal peak
      const mid = ctx.createGain()
      buildPitchShifter(ctx, source, mid, 5)
      const peak = ctx.createBiquadFilter()
      peak.type = 'peaking'
      peak.frequency.value = 2200
      peak.Q.value = 2
      peak.gain.value = 8
      mid.connect(peak)
      peak.connect(master)
      break
    }
    case 'ghost': {
      // Pitch −2 → airy highpass + feedback echo
      const mid = ctx.createGain()
      buildPitchShifter(ctx, source, mid, -2)
      const highpass = ctx.createBiquadFilter()
      highpass.type = 'highpass'
      highpass.frequency.value = 500
      const echo = ctx.createDelay(1)
      echo.delayTime.value = 0.22
      const feedback = ctx.createGain()
      feedback.gain.value = 0.35
      const wet = ctx.createGain()
      wet.gain.value = 0.5
      mid.connect(highpass)
      highpass.connect(master)
      highpass.connect(echo)
      echo.connect(feedback)
      feedback.connect(echo)
      echo.connect(wet)
      wet.connect(master)
      break
    }
    case 'construct': {
      // Radio bandpass + hard crunch, no pitch shift
      const bandpass = ctx.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.value = 1400
      bandpass.Q.value = 1.2
      const shaper = ctx.createWaveShaper()
      shaper.curve = makeDistortionCurve(30) as any
      shaper.oversample = '2x'
      source.connect(bandpass)
      bandpass.connect(shaper)
      shaper.connect(master)
      break
    }
    default:
      source.connect(master)
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
