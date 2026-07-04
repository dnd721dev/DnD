// src/lib/shopNft.ts
// Tier E item NFTs — deterministic generative art + ERC-721 metadata.
//
// Every tier E item gets full graphic design rendered as rich layered SVG:
// a seeded palette, starfield, sigil ring, category glyph, tier crest, and
// an engraved name banner. The same item always renders the same art, so
// the on-chain tokenURI can point at /api/shop/nft/[itemId]/image forever.
//
// Minting: purchases of tier E items mint on the DND721 Items ERC-721.
// The contract address comes from NEXT_PUBLIC_DND721_ITEMS_NFT_ADDRESS —
// when unset, purchases still succeed and the art/metadata endpoints work,
// but no on-chain mint is attempted (graceful degrade until deploy).

import type { ShopItem } from './shopData'

// ─── Mint configuration ───────────────────────────────────────────────────────

export const DND721_ITEMS_NFT_ADDRESS =
  (process.env.NEXT_PUBLIC_DND721_ITEMS_NFT_ADDRESS ?? '') as `0x${string}` | ''

/** Minimal mint ABI — standard OpenZeppelin-style safeMint(to, uri). */
export const DND721_ITEMS_NFT_ABI = [
  {
    name: 'safeMint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',  type: 'address' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
] as const

export function nftMintingEnabled(): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(DND721_ITEMS_NFT_ADDRESS)
}

// ─── Deterministic seed helpers ───────────────────────────────────────────────

function hash32(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return h >>> 0
}

function rng(seed: string): () => number {
  let h = hash32(seed)
  return () => {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5
    return (h >>> 0) / 0xFFFFFFFF
  }
}

// ─── Palettes (picked by item hash) ───────────────────────────────────────────

type Palette = { bg1: string; bg2: string; ring: string; glow: string; metal: string; accent: string }

const PALETTES: Palette[] = [
  { bg1: '#1e1b4b', bg2: '#0f0a2e', ring: '#a78bfa', glow: '#c4b5fd', metal: '#fbbf24', accent: '#f472b6' }, // arcane violet
  { bg1: '#082f49', bg2: '#020617', ring: '#38bdf8', glow: '#7dd3fc', metal: '#e2e8f0', accent: '#34d399' }, // deep sea
  { bg1: '#3b0764', bg2: '#1e0a33', ring: '#e879f9', glow: '#f0abfc', metal: '#fde68a', accent: '#22d3ee' }, // fey twilight
  { bg1: '#431407', bg2: '#1c0701', ring: '#fb923c', glow: '#fdba74', metal: '#fef3c7', accent: '#ef4444' }, // forge ember
  { bg1: '#052e16', bg2: '#01140a', ring: '#4ade80', glow: '#86efac', metal: '#d9f99d', accent: '#fbbf24' }, // verdant
  { bg1: '#450a0a', bg2: '#1a0505', ring: '#f87171', glow: '#fca5a5', metal: '#fcd34d', accent: '#a78bfa' }, // dragon\'s hoard
  { bg1: '#1e293b', bg2: '#020617', ring: '#94a3b8', glow: '#cbd5e1', metal: '#f8fafc', accent: '#60a5fa' }, // moonlit steel
  { bg1: '#422006', bg2: '#180d02', ring: '#facc15', glow: '#fde047', metal: '#fef9c3', accent: '#fb7185' }, // gilded
]

// ─── Category glyphs — hand-drawn vector paths, centered on (0,0), ~140 units ──

type Glyph = { paths: string[]; label: string }

/** Choose a glyph by keywords in the item name; fall back to category. */
function glyphFor(item: ShopItem): Glyph {
  const n = item.name.toLowerCase()
  const P = (...paths: string[]) => paths

  if (/(bag|pouch|quiver|sack)/.test(n)) return { label: 'Container', paths: P(
    'M -45 -20 Q 0 -60 45 -20 L 55 55 Q 0 75 -55 55 Z',
    'M -45 -20 Q 0 -2 45 -20',
    'M -12 -38 Q 0 -52 12 -38',
  ) }
  if (/(cloak|cape|veil|mantle)/.test(n)) return { label: 'Cloak', paths: P(
    'M 0 -60 C -50 -40 -60 20 -40 65 L -10 45 L 0 62 L 10 45 L 40 65 C 60 20 50 -40 0 -60 Z',
    'M -14 -48 A 14 14 0 1 0 14 -48',
  ) }
  if (/(ring|circlet|band)/.test(n)) return { label: 'Ring', paths: P(
    'M 0 12 m -42 0 a 42 42 0 1 0 84 0 a 42 42 0 1 0 -84 0',
    'M 0 12 m -28 0 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0',
    'M -14 -30 L 0 -58 L 14 -30 L 0 -16 Z',
  ) }
  if (/(amulet|necklace|brooch|pendant|medallion|coin|pearl|stone|orb|teacup)/.test(n)) return { label: 'Talisman', paths: P(
    'M 0 -62 C -30 -62 -30 -30 0 -24 C 30 -30 30 -62 0 -62 Z',
    'M 0 8 m -38 0 a 38 38 0 1 0 76 0 a 38 38 0 1 0 -76 0',
    'M 0 8 m -20 0 a 20 20 0 1 0 40 0 a 20 20 0 1 0 -40 0',
  ) }
  if (/(boot|slipper|shoe|anklet|horseshoe)/.test(n)) return { label: 'Boots', paths: P(
    'M -30 -60 L 5 -60 L 5 10 Q 45 10 55 45 L 55 62 L -30 62 Z',
    'M -30 40 L 55 40',
  ) }
  if (/(glove|gauntlet|bracer|thimble)/.test(n)) return { label: 'Gauntlet', paths: P(
    'M -35 60 L -35 -10 L -22 -55 L -10 -12 L -2 -60 L 8 -12 L 18 -52 L 26 -8 L 38 -30 L 38 60 Z',
    'M -35 24 L 38 24',
  ) }
  if (/(hat|helm|crown|headband|circlet|mask|goggles|hood)/.test(n)) return { label: 'Headwear', paths: P(
    'M -55 30 Q 0 -75 55 30 Z',
    'M -62 30 L 62 30 L 62 44 L -62 44 Z',
  ) }
  if (/(lantern|lamp|candle|torch|beacon|flare)/.test(n)) return { label: 'Light', paths: P(
    'M -22 -30 L 22 -30 L 30 40 L -30 40 Z',
    'M -12 -30 L -12 -50 L 12 -50 L 12 -30',
    'M 0 -8 C -10 4 -8 18 0 26 C 8 18 10 4 0 -8 Z',
    'M -30 52 L 30 52',
  ) }
  if (/(scroll|journal|book|map|paper|inkwell|bookmark|manual|page)/.test(n)) return { label: 'Tome', paths: P(
    'M -45 -50 L 35 -50 Q 50 -50 50 -35 L 50 50 L -30 50 Q -45 50 -45 35 Z',
    'M -30 -34 L 35 -34 M -30 -18 L 35 -18 M -30 -2 L 25 -2',
    'M -45 35 Q -45 20 -30 20 L 50 20',
  ) }
  if (/(rope|whip|chain|ladder)/.test(n)) return { label: 'Rope', paths: P(
    'M -40 -55 C 30 -45 -40 -10 20 0 C 60 8 -20 30 30 55',
    'M -46 -58 A 8 8 0 1 0 -32 -50',
  ) }
  if (/(decanter|jug|cauldron|flask|bottle|vial|tonic|philter|potion|elixir|draught)/.test(n)) return { label: 'Vessel', paths: P(
    'M -14 -58 L 14 -58 L 14 -34 Q 42 -16 42 18 Q 42 58 0 58 Q -42 58 -42 18 Q -42 -16 -14 -34 Z',
    'M -20 -58 L 20 -58',
    'M -26 16 Q 0 30 26 16',
  ) }
  if (/(sword|blade|dagger|scabbard|whetstone|shield|belt)/.test(n)) return { label: 'Blade', paths: P(
    'M 0 -66 L 12 -20 L 12 30 L 0 44 L -12 30 L -12 -20 Z',
    'M -30 30 L 30 30',
    'M 0 44 L 0 64',
  ) }
  if (/(saddle|horse|figurine|owl|manta|pigeon)/.test(n)) return { label: 'Creature', paths: P(
    'M 0 -50 C -40 -50 -55 -10 -40 25 C -25 55 25 55 40 25 C 55 -10 40 -50 0 -50 Z',
    'M -18 -16 A 6 6 0 1 0 -6 -16 M 6 -16 A 6 6 0 1 0 18 -16',
    'M -12 16 Q 0 28 12 16',
  ) }
  if (/(tent|pavilion|bedroll|hammock|doorknob|door)/.test(n)) return { label: 'Shelter', paths: P(
    'M 0 -55 L 58 45 L -58 45 Z',
    'M 0 -55 L 0 45',
    'M -14 45 L 0 14 L 14 45',
  ) }
  if (/(lute|instrument|drum|horn|whistle|bell)/.test(n)) return { label: 'Instrument', paths: P(
    'M -20 55 A 26 26 0 1 1 22 40 L 40 -40 L 52 -46 L 56 -36 L 44 -32 L 28 44',
    'M -28 40 A 8 8 0 1 0 -12 46',
  ) }
  if (/(compass|spyglass|lens|orb|weatherglass)/.test(n)) return { label: 'Instrument', paths: P(
    'M 0 0 m -48 0 a 48 48 0 1 0 96 0 a 48 48 0 1 0 -96 0',
    'M 0 -34 L 12 8 L 0 34 L -12 8 Z',
    'M 0 0 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0',
  ) }
  // default: arcane sigil
  return { label: 'Wondrous', paths: P(
    'M 0 -56 L 16 -16 L 56 -16 L 24 8 L 36 48 L 0 24 L -36 48 L -24 8 L -56 -16 L -16 -16 Z',
    'M 0 0 m -14 0 a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0',
  ) }
}

// ─── SVG renderer ─────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Render the full 800×800 layered artwork for a tier E item. */
export function renderItemArtSvg(item: ShopItem): string {
  const seedR = rng(`art:${item.id}`)
  const pal = PALETTES[hash32(item.id) % PALETTES.length]!
  const glyph = glyphFor(item)

  // Starfield — deterministic scatter
  let stars = ''
  for (let i = 0; i < 70; i++) {
    const x = Math.round(seedR() * 800)
    const y = Math.round(seedR() * 800)
    const r = (seedR() * 1.6 + 0.4).toFixed(2)
    const o = (seedR() * 0.5 + 0.15).toFixed(2)
    stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${o}"/>`
  }

  // Sigil ring runes — radial ticks with seeded lengths
  let runes = ''
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2
    const len = 10 + seedR() * 16
    const r0 = 250
    const x1 = 400 + Math.cos(angle) * r0
    const y1 = 400 + Math.sin(angle) * r0
    const x2 = 400 + Math.cos(angle) * (r0 - len)
    const y2 = 400 + Math.sin(angle) * (r0 - len)
    runes += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${pal.ring}" stroke-width="3" opacity="0.7"/>`
  }

  // Light rays behind the glyph
  let rays = ''
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + seedR() * 0.2
    const x2 = 400 + Math.cos(angle) * 230
    const y2 = 400 + Math.sin(angle) * 230
    rays += `<line x1="400" y1="400" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${pal.glow}" stroke-width="${(2 + seedR() * 5).toFixed(1)}" opacity="0.12"/>`
  }

  const glyphPaths = glyph.paths
    .map((p, i) => `<path d="${p}" fill="none" stroke="${i === 0 ? pal.metal : pal.accent}" stroke-width="${i === 0 ? 7 : 5}" stroke-linejoin="round" stroke-linecap="round"/>`)
    .join('')

  const price = item.price_usd != null ? `$${item.price_usd.toFixed(0)}` : ''
  const nameSize = item.name.length > 26 ? 30 : item.name.length > 18 ? 36 : 42

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="${pal.bg1}"/>
      <stop offset="100%" stop-color="${pal.bg2}"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${pal.glow}" stop-opacity="0.55"/>
      <stop offset="70%" stop-color="${pal.glow}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${pal.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${pal.metal}"/>
      <stop offset="100%" stop-color="${pal.ring}"/>
    </linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="2.2"/></filter>
  </defs>

  <!-- background -->
  <rect width="800" height="800" fill="url(#bg)"/>
  ${stars}

  <!-- ornamental frame -->
  <rect x="18" y="18" width="764" height="764" fill="none" stroke="url(#metal)" stroke-width="6" rx="26"/>
  <rect x="34" y="34" width="732" height="732" fill="none" stroke="${pal.ring}" stroke-width="1.5" rx="18" opacity="0.6"/>
  <path d="M 18 120 L 120 18 M 680 18 L 782 120 M 18 680 L 120 782 M 680 782 L 782 680" stroke="url(#metal)" stroke-width="4" fill="none"/>

  <!-- halo + rays -->
  <circle cx="400" cy="400" r="290" fill="url(#halo)"/>
  ${rays}

  <!-- sigil rings -->
  <circle cx="400" cy="400" r="252" fill="none" stroke="${pal.ring}" stroke-width="3" opacity="0.85"/>
  <circle cx="400" cy="400" r="222" fill="none" stroke="${pal.ring}" stroke-width="1.5" opacity="0.5" stroke-dasharray="6 10"/>
  ${runes}

  <!-- glyph plinth -->
  <circle cx="400" cy="400" r="170" fill="${pal.bg2}" opacity="0.75"/>
  <circle cx="400" cy="400" r="170" fill="none" stroke="${pal.metal}" stroke-width="2.5" opacity="0.9"/>

  <!-- category glyph -->
  <g transform="translate(400 392) scale(1.35)" filter="none">${glyphPaths}</g>
  <g transform="translate(400 392) scale(1.35)" opacity="0.45" filter="url(#soft)">${glyphPaths}</g>

  <!-- tier crest -->
  <g transform="translate(400 118)">
    <path d="M -34 -30 L 34 -30 L 46 0 L 0 40 L -46 0 Z" fill="url(#metal)" stroke="${pal.bg2}" stroke-width="3"/>
    <text x="0" y="10" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="bold" fill="${pal.bg2}">E</text>
  </g>

  <!-- name banner -->
  <g>
    <path d="M 70 660 L 730 660 L 758 700 L 730 740 L 70 740 L 42 700 Z" fill="${pal.bg2}" stroke="url(#metal)" stroke-width="4" opacity="0.95"/>
    <text x="400" y="702" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${nameSize}" font-weight="bold" fill="${pal.metal}">${esc(item.name)}</text>
  </g>

  <!-- footer marks -->
  <text x="400" y="775" text-anchor="middle" font-family="Georgia, serif" font-size="17" fill="${pal.ring}" opacity="0.9" letter-spacing="4">DND721 · BISHOP'S SHOP · ${esc(glyph.label.toUpperCase())}${price ? ` · ${price}` : ''}</text>
</svg>`
}

// ─── ERC-721 metadata ─────────────────────────────────────────────────────────

export function buildNftMetadata(item: ShopItem, baseUrl: string) {
  return {
    name: item.name,
    description: `${item.desc}\n\nA permanent wondrous item from Bishop's Shop (DND721). Tier E — never consumed on use.`,
    image: `${baseUrl}/api/shop/nft/${item.id}/image`,
    external_url: `${baseUrl}/shop`,
    attributes: [
      { trait_type: 'Tier', value: item.tier },
      { trait_type: 'Category', value: item.category },
      { trait_type: 'Permanence', value: 'Permanent' },
      ...(item.price_usd != null ? [{ trait_type: 'Shop Price (USD)', value: item.price_usd }] : []),
    ],
  }
}
