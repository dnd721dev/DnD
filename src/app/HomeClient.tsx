'use client'

// DND721 homepage — a cinematic gate into the platform. Layered fantasy
// atmosphere (pure CSS: vignette, ember drift, arcane haze) over a fast,
// scannable pitch. Every card links to a real, working system.

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Swords, Users, Map, Dice6, Store, Landmark, Sparkles, Trophy, Mic,
} from 'lucide-react'

const SYSTEMS = [
  {
    icon: Sparkles,
    title: 'Forge NFT Heroes',
    body: 'Turn your DND721 NFTs into full 5e characters — class, spells, gear, and a living character sheet.',
    href: '/characters/new',
    cta: 'Start forging',
  },
  {
    icon: Users,
    title: 'Campaigns & Parties',
    body: 'Create campaigns, invite your party, schedule sessions, and track the whole adventure.',
    href: '/campaigns',
    cta: 'Find a game',
  },
  {
    icon: Map,
    title: 'Live Tabletop',
    body: 'Maps with fog of war, tokens, traps and portals — run encounters the way you imagine them.',
    href: '/campaigns',
    cta: 'See the table',
  },
  {
    icon: Dice6,
    title: 'Dice, Voice & Initiative',
    body: '3D dice, live voice chat, initiative tracking, and session podcasts recorded automatically.',
    href: '/campaigns',
    cta: 'Roll for it',
  },
  {
    icon: Store,
    title: 'The Marketplace',
    body: 'Trade NFTs for DND721 or ETH, rent heroes out, and mint your private maps as collectible editions.',
    href: '/market',
    cta: 'Browse the vault',
  },
  {
    icon: Landmark,
    title: "Bishop's Shop",
    body: 'A daily-rotating merchant of 500+ potions, scrolls, and wonders — free finds and rare treasures alike.',
    href: '/shop',
    cta: 'Visit Bishop',
  },
  {
    icon: Trophy,
    title: 'Community Rewards',
    body: 'Earn points for playing, DMing, sharing, listening, and lending — climb the leaderboard.',
    href: '/rewards',
    cta: 'Earn points',
  },
  {
    icon: Mic,
    title: 'Spectate & Stream',
    body: 'Friends can listen in live, and any player can stream the table to X, Twitch, or YouTube.',
    href: '/community',
    cta: 'Join the crowd',
  },
]

export function HomeClient() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="mx-auto max-w-7xl">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border px-6 py-16 sm:px-12 sm:py-24"
               style={{ borderColor: 'var(--edge)', background: 'linear-gradient(180deg, var(--surface-1), var(--bg-abyss))' }}>
        {/* Atmosphere layers */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0"
               style={{ background: 'radial-gradient(700px 320px at 30% 15%, rgba(212,169,79,0.10), transparent 65%)' }} />
          <div className="absolute inset-0"
               style={{ background: 'radial-gradient(600px 300px at 78% 80%, rgba(226,121,59,0.10), transparent 60%)' }} />
          {/* Ember drift — skipped for reduced motion via CSS */}
          {!reduceMotion && (
            <>
              <span className="ember" style={{ left: '12%', animationDelay: '0s' }} />
              <span className="ember" style={{ left: '28%', animationDelay: '2.2s' }} />
              <span className="ember" style={{ left: '55%', animationDelay: '4.5s' }} />
              <span className="ember" style={{ left: '73%', animationDelay: '1.3s' }} />
              <span className="ember" style={{ left: '88%', animationDelay: '3.4s' }} />
            </>
          )}
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-2xl"
        >
          <p className="eyebrow">The NFT-Powered Virtual Tabletop</p>
          <h1 className="font-display mt-3 text-4xl font-extrabold leading-tight sm:text-6xl"
              style={{ color: 'var(--text-hi)' }}>
            Your NFTs.
            <br />
            <span style={{ color: 'var(--gold-bright)', textShadow: '0 0 30px rgba(212,169,79,0.35)' }}>
              Your legend.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-mid)' }}>
            Forge full D&amp;D 5e heroes from the NFTs you already own, gather your party,
            and play live — maps, dice, voice, and a marketplace of player-made treasures.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/characters/new" className="btn btn-primary text-base">
              <Swords className="h-4 w-4" /> Forge a Hero
            </Link>
            <Link href="/campaigns" className="btn btn-ghost text-base">
              <Users className="h-4 w-4" /> Find a Game
            </Link>
            <Link href="/market" className="btn btn-ember text-base">
              <Store className="h-4 w-4" /> Marketplace
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Systems grid ─────────────────────────────────────────────── */}
      <section className="mt-12">
        <div className="mb-6 text-center">
          <p className="eyebrow">Everything a table needs</p>
          <h2 className="page-title mt-1">One platform, the whole adventure</h2>
        </div>
        <hr className="rule-gold mb-8" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SYSTEMS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
            >
              <Link href={s.href} className="panel card-hover group flex h-full flex-col p-5">
                <span
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border transition-shadow group-hover:shadow-[var(--glow-gold)]"
                  style={{ borderColor: 'var(--edge)', background: 'var(--surface-3)', color: 'var(--gold)' }}
                >
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-base font-bold" style={{ color: 'var(--text-hi)' }}>
                  {s.title}
                </h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-mid)' }}>
                  {s.body}
                </p>
                <span className="mt-3 text-xs font-semibold transition-colors"
                      style={{ color: 'var(--gold)' }}>
                  {s.cta} →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Closing call ─────────────────────────────────────────────── */}
      <section className="panel-ornate mt-12 flex flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="eyebrow">The table is set</p>
        <h2 className="font-display text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text-hi)' }}>
          Connect your wallet and take a seat.
        </h2>
        <p className="max-w-lg text-sm" style={{ color: 'var(--text-mid)' }}>
          Your first character is minutes away — and Bishop keeps a free potion behind the counter for new adventurers.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href="/characters/new" className="btn btn-primary">Create your first character</Link>
          <Link href="/shop" className="btn btn-ghost">Claim today&apos;s free item</Link>
        </div>
      </section>
    </div>
  )
}
