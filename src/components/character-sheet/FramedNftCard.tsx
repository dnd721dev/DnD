'use client'

import { Cinzel } from 'next/font/google'

// Premium gothic display serif — closest Google-font match to the engraved
// DND721 plaque lettering (sharp wedge serifs, condensed Roman caps).
const cinzel = Cinzel({ subsets: ['latin'], weight: ['700', '900'] })

/**
 * DND721 gothic card: the character's NFT image sits inside the ornate
 * skull-and-thorn border (public/card-frame.png, 1024×1024 with a
 * transparent window), with the character name engraved into the top
 * nameplate in the same antique-gold treatment as the bottom DND721 plaque.
 *
 * Nameplate safe area on the 1024 grid: x 218..806, y 116..192, optical
 * center (512,154). All placement below is % of the square card so the
 * component scales to any rendered size.
 */

/** Cap-height spec from the 1024 design grid, as a % of card width:
 *  ≤10 chars → 56–70px, 11–18 → 44–58px, 19–28 → 34–46px. */
function titleSizePct(name: string): number {
  const len = name.length
  if (len <= 10) return 6.1  // ~62px @1024
  if (len <= 18) return 4.9  // ~50px @1024
  if (len <= 28) return 3.8  // ~39px @1024
  return 3.2                 // very long names — shrink before tightening tracking
}

export function FramedNftCard({
  imageUrl,
  name,
  className,
}: {
  imageUrl: string | null
  name: string
  className?: string
}) {
  const display = name.toUpperCase()
  return (
    <div
      className={`relative aspect-square w-full select-none ${className ?? ''}`}
      style={{ containerType: 'inline-size' }}
    >
      {/* NFT art fills the frame's transparent window (behind the border). */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="absolute object-cover"
          style={{ left: '7%', right: '7%', top: '20.5%', bottom: '21%', width: '86%', height: '58.5%' }}
        />
      ) : (
        <div
          className="absolute flex items-center justify-center bg-slate-900 text-xs text-slate-500"
          style={{ left: '7%', right: '7%', top: '20.5%', bottom: '21%', width: '86%', height: '58.5%' }}
        >
          No NFT
        </div>
      )}

      {/* Ornate border overlay */}
      <img
        src="/card-frame.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Engraved gold title in the top nameplate.
          Safe area: x 21.3%..78.7%, vertical optical center at 15.04%. */}
      <div
        className="pointer-events-none absolute flex items-center justify-center overflow-hidden"
        style={{ left: '21.3%', width: '57.4%', top: '11.3%', height: '7.5%' }}
      >
        <span
          className={`${cinzel.className} whitespace-nowrap font-black leading-none tracking-[0.06em]`}
          style={{
            fontSize: `${titleSizePct(display)}cqw`,
            // Antique-gold → bronze metallic fill with a bright rim pass
            background:
              'linear-gradient(180deg, #fbe8a6 0%, #f0c75e 22%, #d99e2b 48%, #9c6b1c 72%, #7a4f14 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            // Thin dark outer stroke + chiseled bevel via layered shadows
            WebkitTextStroke: '0.6px rgba(35,20,5,0.9)',
            filter: [
              'drop-shadow(0 1px 0 rgba(255,238,170,0.35))',   // top rim highlight
              'drop-shadow(0 -1px 1px rgba(40,20,0,0.55))',    // inner shadow
              'drop-shadow(0 2px 2px rgba(0,0,0,0.8))',        // engraved depth
            ].join(' '),
          }}
        >
          {display}
        </span>
      </div>
    </div>
  )
}
