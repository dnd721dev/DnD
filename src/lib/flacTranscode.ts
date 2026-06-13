'use client'

// In-browser OGG (opus) → FLAC transcoding for recording tracks.
//
// LiveKit egress writes per-participant audio as OGG/opus; the platform goal
// requires multi-track FLAC exports. Rather than running a server-side
// transcoder (not available on Vercel serverless), we lazy-load ffmpeg.wasm
// in the browser only when a FLAC download is requested. The ~30 MB core is
// pulled from the CDN once and cached by the browser.

let ffmpegInstance: any | null = null
let loadingPromise: Promise<any> | null = null

const CORE_VERSION = '0.12.6'
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`

async function getFFmpeg(onProgress?: (ratio: number) => void) {
  if (ffmpegInstance) return ffmpegInstance
  if (!loadingPromise) {
    loadingPromise = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { toBlobURL } = await import('@ffmpeg/util')
      const ffmpeg = new FFmpeg()
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      ffmpegInstance = ffmpeg
      return ffmpeg
    })()
  }
  const ffmpeg = await loadingPromise
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }: { progress: number }) => onProgress(progress))
  }
  return ffmpeg
}

/**
 * Fetch an audio file (OGG/MP4), transcode it to FLAC in the browser, and
 * trigger a download. Throws on failure so callers can toast the error.
 */
export async function downloadAsFlac(
  sourceUrl: string,
  outName: string,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  const ffmpeg = await getFFmpeg(onProgress)
  const { fetchFile } = await import('@ffmpeg/util')

  const inputName = 'input_audio'
  const outputName = 'output.flac'

  await ffmpeg.writeFile(inputName, await fetchFile(sourceUrl))
  // -vn strips any video stream (master recordings may be MP4 A/V).
  const code = await ffmpeg.exec(['-i', inputName, '-vn', '-c:a', 'flac', outputName])
  if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`)

  const data = await ffmpeg.readFile(outputName)
  // Copy into a fresh Uint8Array so the Blob ctor sees a plain ArrayBuffer
  // (ffmpeg.wasm may back its output with a SharedArrayBuffer).
  const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'audio/flac' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = outName.endsWith('.flac') ? outName : `${outName}.flac`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  // Clean up the in-memory FS so repeated transcodes don't accumulate.
  try { await ffmpeg.deleteFile(inputName) } catch { /* ignore */ }
  try { await ffmpeg.deleteFile(outputName) } catch { /* ignore */ }
}
