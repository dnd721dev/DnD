export type SubclassFeatureLevels = Record<number, string[]>

export const SUBCLASS_FEATURES: Record<string, SubclassFeatureLevels> = {
  // ======== SRD / existing entries can stay here ========
  // (leave your current ones above/below — not repeating them here)

  // =====================================================
  // =================== DND721 SUBCLASSES ===============
  // =====================================================

  // Ranger — Winter Walker Conclave (DND721)
  ranger_winter_walker: {
    3: [
      'Winter Walker Training — you gain cold-themed wilderness mastery and winter survival techniques (DND721).',
      'Frost Mark — you can mark a target with biting cold, making it easier to track and punish (DND721).',
    ],
    7: [
      'Glacial Step — you move across difficult icy terrain with ease and can briefly surge with winter speed (DND721).',
    ],
    11: [
      'Icebound Ambush — your first strike from concealment can bite deeper with winter power (DND721).',
    ],
    15: [
      'Whiteout Hunter — you can cloak yourself in a brief whiteout to reposition, escape, or press the attack (DND721).',
    ],
  },

  // Monk — Way of the Ascendent Dragon (DND721)
  monk_ascendent_dragon: {
    3: [
      'Draconic Disciple — you channel draconic force through your ki, shaping strikes with elemental intensity (DND721).',
      'Breath of the Ascendent — you can expend ki to unleash a short, focused breath burst (DND721).',
    ],
    6: [
      'Frightful Presence — you can flare your aura to rattle nearby foes for a moment (DND721).',
    ],
    11: [
      'Dragon’s Wings — you can briefly manifest spectral wings for leaps, glides, or short flight bursts (DND721).',
    ],
    17: [
      'True Ascendancy — your draconic ki surges, empowering breath and presence beyond normal limits (DND721).',
    ],
  },

  // Druid — Circle of the Sea (DND721)
  druid_sea: {
    2: [
      'Sea-Touched Magic — you draw on tides and saltwind; your spells feel like surf and storm (DND721).',
      'Tidecall — you can call a minor surge of water to hinder movement or shove loose objects (DND721).',
    ],
    6: [
      'Undertow Ward — you can wrap allies in a briny ward that blunts harm for a moment (DND721).',
    ],
    10: [
      'Stormskin — you gain a resilient, stormy protection that hardens when danger rises (DND721).',
    ],
    14: [
      'Maelstrom Form — you can become a swirling sea-force briefly, repositioning and disrupting foes (DND721).',
    ],
  },

  // Bard — College of the Moon (DND721)
  bard_moon: {
    3: [
      'Moonlit Muse — you channel lunar rhythm into your performances (DND721).',
      'Lunar Inspiration — your inspiration carries a moonlit twist: bolster courage or blur perception (DND721).',
    ],
    6: [
      'Waxing & Waning — you can shift your performance “phase” to lean toward protection or aggression (DND721).',
    ],
    14: [
      'Eclipse Finale — you can unleash a dramatic lunar crescendo that turns the momentum of a scene (DND721).',
    ],
  },

  // Rogue — Scion of the Three (DND721)
  rogue_scion_of_the_three: {
    3: [
      'Threefold Path — you adopt one of three “masks” that changes how you approach stealth, deception, or violence (DND721).',
      'Triad Feint — your misdirection makes openings; once per turn you can set up advantage-like pressure (DND721).',
    ],
    9: [
      'Threefold Step — you can slip away from danger with uncanny timing when your mask demands it (DND721).',
    ],
    13: [
      'Triune Gambit — you can chain deception into a decisive strike, forcing a hard choice on your target (DND721).',
    ],
    17: [
      'Scion’s Dominance — your presence becomes mythic; your “mask” effects grow sharper and more reliable (DND721).',
    ],
  },

  // Sorcerer — Spellfire (DND721)
  sorcerer_spellfire: {
    1: [
      'Spellfire Spark — raw spellfire flickers within you; your casting sometimes carries a visible flare (DND721).',
      'Spellfire Reservoir — you can gather unstable arcane heat and vent it with intent (DND721).',
    ],
    6: [
      'Absorb Spellfire — you can drink in ambient magic or remnants of spells to fuel your next burst (DND721).',
    ],
    14: [
      'Spellfire Mantle — you wreathe yourself in controlled spellfire, discouraging attackers (DND721).',
    ],
    18: [
      'Cataclysmic Release — you can unleash a signature spellfire outpour that defines legends (DND721).',
    ],
  },
}
