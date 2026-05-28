// src/lib/invocations.ts
// Wave 4 — Warlock Eldritch Invocations.
//
// Most invocations are passive flags surfaced for display. Only a few currently
// gate mechanics in the runtime (Book of Ancient Secrets → ritual casting in
// the spell dashboard). Other effects (Agonizing Blast damage boost, Repelling
// Blast pushback, etc.) are documented here but not yet wired into combat.

export type InvocationKey =
  | 'agonizing_blast'
  | 'armor_of_shadows'
  | 'ascendant_step'
  | 'beast_speech'
  | 'beguiling_influence'
  | 'bewitching_whispers'
  | 'book_of_ancient_secrets'
  | 'chains_of_carceri'
  | 'devils_sight'
  | 'dreadful_word'
  | 'eldritch_sight'
  | 'eldritch_spear'
  | 'eyes_of_the_rune_keeper'
  | 'fiendish_vigor'
  | 'gaze_of_two_minds'
  | 'lifedrinker'
  | 'mask_of_many_faces'
  | 'master_of_myriad_forms'
  | 'minions_of_chaos'
  | 'mire_the_mind'
  | 'misty_visions'
  | 'one_with_shadows'
  | 'otherworldly_leap'
  | 'repelling_blast'
  | 'sculptor_of_flesh'
  | 'sign_of_ill_omen'
  | 'thief_of_five_fates'
  | 'thirsting_blade'
  | 'visions_of_distant_realms'
  | 'voice_of_the_chain_master'
  | 'whispers_of_the_grave'
  | 'witch_sight'

export type Invocation = {
  key: InvocationKey
  name: string
  /** Minimum Warlock level required */
  minLevel: number
  /** Optional prerequisites (other invocations, pact boons, spells, etc.) */
  prereq?: string
  /** Short rules text */
  summary: string
}

/**
 * Curated set of SRD-ish invocations. Not exhaustive — this is the subset
 * we want available in the UI for V1. More can be added incrementally.
 */
export const INVOCATIONS: Invocation[] = [
  {
    key: 'agonizing_blast',
    name: 'Agonizing Blast',
    minLevel: 2,
    prereq: 'eldritch blast cantrip',
    summary: 'Add your CHA modifier to each Eldritch Blast hit.',
  },
  {
    key: 'armor_of_shadows',
    name: 'Armor of Shadows',
    minLevel: 2,
    summary: 'You can cast Mage Armor on yourself at will, without a slot.',
  },
  {
    key: 'beast_speech',
    name: 'Beast Speech',
    minLevel: 2,
    summary: 'You can speak with beasts and have them understand you.',
  },
  {
    key: 'beguiling_influence',
    name: 'Beguiling Influence',
    minLevel: 2,
    summary: 'Gain proficiency in Deception and Persuasion.',
  },
  {
    key: 'book_of_ancient_secrets',
    name: 'Book of Ancient Secrets',
    minLevel: 2,
    prereq: 'Pact of the Tome',
    summary: 'Inscribe ritual spells in your Book of Shadows and cast them as rituals (no slot, +10 min).',
  },
  {
    key: 'devils_sight',
    name: "Devil's Sight",
    minLevel: 2,
    summary: 'See normally in darkness (magical and non-magical) within 120 ft.',
  },
  {
    key: 'eldritch_sight',
    name: 'Eldritch Sight',
    minLevel: 2,
    summary: 'You can cast Detect Magic at will, without a slot.',
  },
  {
    key: 'eldritch_spear',
    name: 'Eldritch Spear',
    minLevel: 2,
    prereq: 'eldritch blast cantrip',
    summary: 'Eldritch Blast range becomes 300 feet.',
  },
  {
    key: 'fiendish_vigor',
    name: 'Fiendish Vigor',
    minLevel: 2,
    summary: 'You can cast False Life at will, without a slot.',
  },
  {
    key: 'mask_of_many_faces',
    name: 'Mask of Many Faces',
    minLevel: 2,
    summary: 'You can cast Disguise Self at will, without a slot.',
  },
  {
    key: 'misty_visions',
    name: 'Misty Visions',
    minLevel: 2,
    summary: 'You can cast Silent Image at will, without a slot.',
  },
  {
    key: 'repelling_blast',
    name: 'Repelling Blast',
    minLevel: 2,
    prereq: 'eldritch blast cantrip',
    summary: 'Push a creature 10 feet on a successful Eldritch Blast hit.',
  },
  {
    key: 'thirsting_blade',
    name: 'Thirsting Blade',
    minLevel: 5,
    prereq: 'Pact of the Blade',
    summary: 'You can attack twice when you take the Attack action with your pact weapon.',
  },
  {
    key: 'lifedrinker',
    name: 'Lifedrinker',
    minLevel: 12,
    prereq: 'Pact of the Blade',
    summary: 'When you hit with your pact weapon, deal +CHA mod necrotic damage.',
  },
  {
    key: 'whispers_of_the_grave',
    name: 'Whispers of the Grave',
    minLevel: 9,
    summary: 'You can cast Speak with Dead at will, without a slot.',
  },
  {
    key: 'visions_of_distant_realms',
    name: 'Visions of Distant Realms',
    minLevel: 15,
    summary: 'You can cast Arcane Eye at will, without a slot.',
  },
  {
    key: 'witch_sight',
    name: 'Witch Sight',
    minLevel: 15,
    summary: 'See the true form of any creature within 30 ft.',
  },
  {
    key: 'chains_of_carceri',
    name: 'Chains of Carceri',
    minLevel: 15,
    prereq: 'Pact of the Chain',
    summary: 'Cast Hold Monster at will on celestials, fiends, and elementals (1/long-rest per creature).',
  },
]

/**
 * Number of invocations a Warlock knows at the given class level (PHB).
 * Returns 0 for non-Warlock classes.
 */
export function getInvocationCount(level: number): number {
  if (level < 2) return 0
  if (level < 5) return 2
  if (level < 7) return 3
  if (level < 9) return 4
  if (level < 12) return 5
  if (level < 15) return 6
  if (level < 18) return 7
  return 8
}

/**
 * Returns the invocations the Warlock could pick at the given level.
 * Excludes ones whose minLevel is above the current level.
 */
export function getEligibleInvocations(level: number): Invocation[] {
  return INVOCATIONS.filter(i => level >= i.minLevel)
}

/** True if the Warlock has Book of Ancient Secrets → gains ritual casting. */
export function hasRitualCasting(invocations: string[] | null | undefined): boolean {
  return (invocations ?? []).includes('book_of_ancient_secrets')
}
