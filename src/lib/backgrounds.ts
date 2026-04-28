// src/lib/backgrounds.ts
// SRD-style backgrounds for DND721.
// Uses 2014 5e-style backgrounds with 2024 ability score modifiers:
// - skill proficiencies
// - tool proficiencies
// - language choices
// - starting equipment summary
// - a short, original "feature" summary
// - ability score modifiers (2024 rules: typically +2/+1)

import type { SkillKey } from './skills'
import type { LanguageKey } from './races'

export type BackgroundKey =
  | 'acolyte'
  | 'charlatan'
  | 'criminal'
  | 'entertainer'
  | 'folkHero'
  | 'guildArtisan'
  | 'hermit'
  | 'noble'
  | 'outlander'
  | 'sage'
  | 'sailor'
  | 'soldier'
  | 'urchin'

export type BackgroundFeature = {
  name: string
  /** Short reminder text, not full rules. */
  summary: string
}

export type AbilityModKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type Background = {
  key: BackgroundKey
  name: string
  /** Skill proficiencies granted by this background. */
  skillProficiencies: SkillKey[]
  /**
   * Tool proficiencies or vehicles. These are simple strings for now;
   * later you can point them at a tools lib if you like.
   */
  toolProficiencies: string[]
  /** Extra languages the character can choose (in addition to their race). */
  extraLanguageChoices: number
  /**
   * Simple equipment summary; you can expand this into real items
   * once your equipment lib is ready.
   */
  startingEquipment: string[]
  /** The unique background feature. */
  feature: BackgroundFeature
  /**
   * Ability score bonuses granted by this background (2024 rules).
   * Typically +2 to one ability and +1 to another.
   */
  abilityScoreModifiers: Partial<Record<AbilityModKey, number>>
  /**
   * Suggested personality traits (original text, 5e-inspired).
   * Players can click to fill their personality section or write their own.
   */
  personalityTraits?: string[]
  /** Suggested ideals — what the character believes or fights for. */
  ideals?: string[]
  /** Suggested bonds — people, places, or oaths they're tied to. */
  bonds?: string[]
  /** Suggested flaws — the cracks in their armor that make them interesting. */
  flaws?: string[]
}

// ------------------------------------
// Background definitions (5e-style)
// ------------------------------------

export const BACKGROUNDS: Record<BackgroundKey, Background> = {
  // ===== ACOLYTE =====
  acolyte: {
    key: 'acolyte',
    name: 'Acolyte',
    skillProficiencies: ['insight', 'religion'],
    toolProficiencies: [],
    extraLanguageChoices: 2,
    startingEquipment: [
      'Holy symbol',
      'Prayer book or prayer wheel',
      '5 sticks of incense',
      'Vestments',
      'Set of common clothes',
      '15 gp',
    ],
    feature: {
      name: 'Shelter of the Faithful',
      summary:
        'You belong to a religious community that offers you modest shelter, support, and guidance at temples of your faith.',
    },
    abilityScoreModifiers: { wis: 2, int: 1 },
    personalityTraits: [
      'I see omens in every event — the gods are always trying to speak to those who listen.',
      'I quote sacred texts and proverbs in almost every situation.',
      'I am tolerant of other faiths and see wisdom in all sincere devotion.',
      'I am rigid in my thinking once I decide something is right.',
    ],
    ideals: [
      'Faith. I trust my deity to guide me even when the path is dark.',
      'Tradition. The old rites and customs must be preserved at all costs.',
      'Charity. I help those in need, no matter the cost to myself.',
    ],
    bonds: [
      'I would die to recover a stolen relic of my temple.',
      'I owe a great debt to the priest who took me in as a child.',
      'My faith is my shield; I carry it into every dark place.',
    ],
    flaws: [
      'I am inflexible in my beliefs and assume those who disagree are corrupt.',
      'I am suspicious of strangers and expect the worst of them.',
      'Once I commit to a cause, I find it almost impossible to abandon it.',
    ],
  },

  // ===== CHARLATAN =====
  charlatan: {
    key: 'charlatan',
    name: 'Charlatan',
    skillProficiencies: ['deception', 'sleightOfHand'],
    toolProficiencies: ['Disguise kit', 'Forgery kit'],
    extraLanguageChoices: 0,
    startingEquipment: [
      'Fine clothes',
      'Disguise kit',
      'A favorite con prop (e.g., weighted dice, fake signet ring)',
      '15 gp',
    ],
    feature: {
      name: 'False Identity',
      summary:
        'You maintain a well-developed second persona, complete with forged papers and disguises, that can pass casual scrutiny.',
    },
    abilityScoreModifiers: { cha: 2, dex: 1 },
    personalityTraits: [
      'I fall in and out of love easily and am always pursuing someone.',
      'I have a tell when I lie — a habit I keep trying and failing to break.',
      'I am confident to the point of arrogance, even in situations I should fear.',
      'I always have a backup plan, and a backup to the backup.',
    ],
    ideals: [
      'Independence. I am a free spirit — no one tells me what to do.',
      'Creativity. The best con is one nobody has ever tried before.',
      'Fairness. I only cheat those who deserve to be taken down a peg.',
    ],
    bonds: [
      'I swindled someone I genuinely cared about, and I have never forgiven myself.',
      'Somewhere out there I have a rival who would love nothing more than to see me fail.',
      'My freedom matters more than anything — I will not be caged again.',
    ],
    flaws: [
      'I can\'t resist a long shot if the potential payoff is huge.',
      'I\'m never satisfied with what I have — there\'s always a bigger score.',
      'I\'m too greedy for my own good; no one can bribe me, because I ask too much.',
    ],
  },

  // ===== CRIMINAL / SPY =====
  criminal: {
    key: 'criminal',
    name: 'Criminal / Spy',
    skillProficiencies: ['deception', 'stealth'],
    toolProficiencies: ['One type of gaming set', "Thieves' tools"],
    extraLanguageChoices: 0,
    startingEquipment: [
      'Crowbar',
      'Dark common clothes with hood',
      'Belts or pouches for stashing small items',
      '15 gp',
    ],
    feature: {
      name: 'Criminal Contact',
      summary:
        'You have a reliable underworld contact who can pass messages and help you find illicit information or goods.',
    },
    abilityScoreModifiers: { dex: 2, int: 1 },
    personalityTraits: [
      'I always have an eye on the exits.',
      'I am incredibly slow to trust — those who seem the kindest usually have the most to hide.',
      'I don\'t talk about the things I\'ve done. It\'s better for everyone.',
      'I am always calm, no matter the situation. Panic is for amateurs.',
    ],
    ideals: [
      'Honor. I don\'t steal from people who can\'t afford to lose it.',
      'Freedom. Chains, laws, debts — I live to break them.',
      'People. I\'m loyal to the crew, no matter what.',
    ],
    bonds: [
      'I\'m trying to pay off a debt I owe to a dangerous patron.',
      'Someone I love was killed by an official. One day I\'ll settle that score.',
      'There\'s a heist I pulled that still haunts me — I left someone behind.',
    ],
    flaws: [
      'When faced with trouble, I flee rather than fight.',
      'An enemy would have to be blind not to notice how much I hate them.',
      'If there\'s a plan, I\'ll deviate from it the moment I see an opportunity.',
    ],
  },

  // ===== ENTERTAINER =====
  entertainer: {
    key: 'entertainer',
    name: 'Entertainer',
    skillProficiencies: ['acrobatics', 'performance'],
    toolProficiencies: ['Disguise kit', 'One musical instrument'],
    extraLanguageChoices: 0,
    startingEquipment: [
      'One musical instrument',
      'Theatrical costume',
      'Token of admiration from a fan',
      '15 gp',
    ],
    feature: {
      name: 'By Popular Demand',
      summary:
        'You can usually find a place to perform, earning food and lodging in exchange for your talents.',
    },
    abilityScoreModifiers: { cha: 2, dex: 1 },
    personalityTraits: [
      'I know a story relevant to almost every situation.',
      'Whenever I arrive somewhere new, I scope out the stage before I scope out the danger.',
      'I love being the center of attention — and I\'m good at it.',
      'I change my mood or my mind as quickly as I change costumes.',
    ],
    ideals: [
      'Beauty. Art is the highest form of truth, and I strive to perfect my craft.',
      'Creativity. The world is dull unless we paint it with stories and music.',
      'Freedom. I must be free to perform, travel, and create.',
    ],
    bonds: [
      'My instrument is my most prized possession; it was a gift from someone I loved.',
      'I want to be famous — at any cost.',
      'A rival performer humiliated me once. I\'ll outshine them publicly someday.',
    ],
    flaws: [
      'I\'ll do anything to win fame and renown.',
      'I secretly worry that my best performance is already behind me.',
      'I can\'t help but lie, even when the truth would serve me better.',
    ],
  },

  // ===== FOLK HERO =====
  folkHero: {
    key: 'folkHero',
    name: 'Folk Hero',
    skillProficiencies: ['animalHandling', 'survival'],
    toolProficiencies: ["One type of artisan's tools", 'Vehicles (land)'],
    extraLanguageChoices: 0,
    startingEquipment: [
      "Set of artisan's tools",
      'Shovel or farming implement',
      'Common clothes',
      'Token marking you as a local hero',
      '10 gp',
    ],
    feature: {
      name: 'Rustic Hospitality',
      summary:
        "Common folk recognize you as one of their own and are inclined to shelter you and your companions, as long as you don't abuse their trust.",
    },
    abilityScoreModifiers: { wis: 2, con: 1 },
    personalityTraits: [
      'I judge people by their actions, not their words.',
      'If someone\'s in trouble, I\'m the first to offer help — even before I think it through.',
      'I misuse long words in an attempt to sound smarter.',
      'I\'m confident in my own abilities, but I have a soft spot for the underdog.',
    ],
    ideals: [
      'Respect. People deserve to be treated with dignity, no matter who they are.',
      'Fairness. No one should get away with putting their thumb on the scale.',
      'Destiny. Nothing will stop me from becoming the hero the people need.',
    ],
    bonds: [
      'The tyrant who oppressed my people will be stopped — by me if no one else.',
      'I protect the community that sheltered me when I had nothing.',
      'A mentor believed in me when no one else did. I carry that with me.',
    ],
    flaws: [
      'Tyrants and bullies make my blood boil. I can\'t stand to watch injustice.',
      'I have a tendency to rush in without a plan.',
      'I sometimes forget that not everyone wants to be saved.',
    ],
  },

  // ===== GUILD ARTISAN =====
  guildArtisan: {
    key: 'guildArtisan',
    name: 'Guild Artisan',
    skillProficiencies: ['insight', 'persuasion'],
    toolProficiencies: ["One type of artisan's tools"],
    extraLanguageChoices: 1,
    startingEquipment: [
      "Set of artisan's tools",
      'Letter of introduction from your guild',
      "Traveler's clothes",
      '15 gp',
    ],
    feature: {
      name: 'Guild Membership',
      summary:
        'You belong to a trade guild that offers support, legal help, and contacts in exchange for dues and obligations.',
    },
    abilityScoreModifiers: { cha: 2, int: 1 },
    personalityTraits: [
      'I believe that anything worth doing is worth doing right.',
      'I\'m rude to those who disrespect my craft or my guild.',
      'I like to explain how things are made, whether or not anyone asked.',
      'I am a perfectionist. Good enough is never good enough.',
    ],
    ideals: [
      'Community. It\'s the duty of every crafts-person to contribute to the prosperity of the guild.',
      'Generosity. My talents were given to me to be shared with the world.',
      'Aspiration. I work hard to be the best at my craft.',
    ],
    bonds: [
      'The workshop where I was trained is the most important place in the world to me.',
      'I owe a debt to my guild that I\'ll never fully repay.',
      'I dream of making something that will outlast me.',
    ],
    flaws: [
      'I hold grudges and am slow to forgive those who cross me or my guild.',
      'I am arrogant about the quality of my work — I can\'t take criticism well.',
      'I am obsessed with wealth, always calculating what things are worth.',
    ],
  },

  // ===== HERMIT =====
  hermit: {
    key: 'hermit',
    name: 'Hermit',
    skillProficiencies: ['medicine', 'religion'],
    toolProficiencies: ['Herbalism kit'],
    extraLanguageChoices: 1,
    startingEquipment: [
      'Scroll case with notes on your studies or revelation',
      'Winter blanket',
      'Common clothes',
      'Herbalism kit',
      '5 gp',
    ],
    feature: {
      name: 'Discovery',
      summary:
        'During your isolation, you uncovered a significant insight or secret that shapes your path in the world.',
    },
    abilityScoreModifiers: { wis: 2, con: 1 },
    personalityTraits: [
      'I\'ve been in the wilderness so long that I find crowds and noise deeply unsettling.',
      'I am working on a grand theory of the universe — and I talk about it constantly.',
      'I am utterly serene, even in the face of disaster.',
      'I lack social graces and often say exactly what I think.',
    ],
    ideals: [
      'Greater Good. My isolation helped me see the truth: we must protect what we love.',
      'Logic. Emotions cloud good judgment. I prefer a reasoned approach to problems.',
      'Self-Knowledge. If you know yourself, there is nothing the world can take from you.',
    ],
    bonds: [
      'The revelation I uncovered in solitude must reach the right ears — or be buried forever.',
      'I left someone behind when I withdrew from the world. I owe them.',
      'My solitude was not peaceful; something drove me out there, and it may follow me.',
    ],
    flaws: [
      'I am dogmatic in my thinking — once I decide something, I rarely reconsider.',
      'I am suspicious of strangers and slow to extend trust.',
      'I harbor dark, unsettling thoughts that I keep locked away.',
    ],
  },

  // ===== NOBLE =====
  noble: {
    key: 'noble',
    name: 'Noble',
    skillProficiencies: ['history', 'persuasion'],
    toolProficiencies: ['One type of gaming set'],
    extraLanguageChoices: 1,
    startingEquipment: [
      'Fine clothes',
      'Signet ring or family emblem',
      'Scroll of pedigree',
      '25 gp',
    ],
    feature: {
      name: 'Position of Privilege',
      summary:
        'Your noble birth opens doors: many commoners defer to you, and you can often secure audiences with local leaders.',
    },
    abilityScoreModifiers: { cha: 2, int: 1 },
    personalityTraits: [
      'I don\'t like to get my hands dirty, and I won\'t start now.',
      'Despite my noble birth, I do not place myself above others — I simply expect the best of everyone.',
      'I take great pains with my personal appearance; sloppiness is a moral failing.',
      'I am genuinely kind to those who serve me and remember their names.',
    ],
    ideals: [
      'Responsibility. It is the duty of the nobility to protect those beneath them.',
      'Power. If I can attain more power, nothing and no one can stop me.',
      'Noble Obligation. My privilege obligates me to improve the world for those less fortunate.',
    ],
    bonds: [
      'I will do whatever it takes to protect my family name, even crimes.',
      'My house betrayed another, and the debt must one day be repaid.',
      'I look down on most people, but I secretly envy their freedom.',
    ],
    flaws: [
      'I secretly believe that everyone else is beneath me.',
      'I hide a truly scandalous secret that could ruin my family.',
      'I am too quick to assume others are acting out of petty motives.',
    ],
  },

  // ===== OUTLANDER =====
  outlander: {
    key: 'outlander',
    name: 'Outlander',
    skillProficiencies: ['athletics', 'survival'],
    toolProficiencies: ['One type of musical instrument'],
    extraLanguageChoices: 1,
    startingEquipment: [
      'Staff',
      'Hunting trap',
      'Trophy from an animal you killed',
      "Traveler's clothes",
      '10 gp',
    ],
    feature: {
      name: 'Wanderer',
      summary:
        'You have a strong memory for maps and terrain and can usually find food and fresh water for yourself and companions in the wild.',
    },
    abilityScoreModifiers: { str: 2, wis: 1 },
    personalityTraits: [
      'I watch over my companions as if they were part of my family.',
      'I am direct. I say what I mean and expect the same from others.',
      'I have a lesson from nature for every situation, whether it\'s welcome or not.',
      'I was, in fact, raised by wolves — or something similar — and it shows.',
    ],
    ideals: [
      'Change. Life is like the seasons: in constant change. We must adapt.',
      'Nature. The natural world is more important than all the trappings of civilization.',
      'Glory. I must earn glory in battle, for my tribe and my ancestors.',
    ],
    bonds: [
      'My family, clan, or tribe is the most important thing in my life.',
      'An injury to the natural world is an injury to me.',
      'I am the last survivor of my people, and I must ensure their memory endures.',
    ],
    flaws: [
      'I am slow to trust members of other races and cultures.',
      'Violence is my answer to almost any challenge.',
      'I don\'t respect the authority of those who haven\'t proven themselves.',
    ],
  },

  // ===== SAGE =====
  sage: {
    key: 'sage',
    name: 'Sage',
    skillProficiencies: ['arcana', 'history'],
    toolProficiencies: [],
    extraLanguageChoices: 2,
    startingEquipment: [
      'Bottle of ink and quill',
      'Small knife',
      'Letter from a colleague or institution',
      'Common clothes',
      '10 gp',
    ],
    feature: {
      name: 'Researcher',
      summary:
        "You know how to track down lore: if you don't know an answer, you often know where or whom to ask.",
    },
    abilityScoreModifiers: { int: 2, wis: 1 },
    personalityTraits: [
      'I use polite euphemisms when I truly mean something harsh.',
      'I\'ve read about every situation I\'ve ever faced, and I quote the relevant texts.',
      'I\'m willing to listen to every side before forming an opinion.',
      'I speak carefully and deliberately, never saying more than I must.',
    ],
    ideals: [
      'Knowledge. The path to power and self-improvement is through knowledge.',
      'Beauty. Knowledge reveals the elegant patterns underlying all things.',
      'No Limits. Nothing should fetter the infinite possibility inherent in all existence.',
    ],
    bonds: [
      'I have an ancient text that holds terrible secrets — secrets that must not fall into the wrong hands.',
      'I seek to find a question whose answer could change the world.',
      'A former colleague was driven mad by forbidden knowledge. I search for a cure.',
    ],
    flaws: [
      'I am easily distracted by the promise of information.',
      'Most people scream and run when they see a demon. I stop and take notes.',
      'Unlocking an ancient mystery is worth the price of a civilization.',
    ],
  },

  // ===== SAILOR =====
  sailor: {
    key: 'sailor',
    name: 'Sailor',
    skillProficiencies: ['athletics', 'perception'],
    toolProficiencies: ["Navigator's tools", 'Vehicles (water)'],
    extraLanguageChoices: 0,
    startingEquipment: [
      'Belaying pin (club)',
      '50 ft. silk rope',
      'Lucky charm (rabbit\'s foot, carved figurine, or similar)',
      'Set of common clothes',
      '10 gp',
    ],
    feature: {
      name: "Ship's Passage",
      summary:
        "You can secure free passage on sailing vessels for yourself and companions in exchange for labor. You know how to read weather, navigate by stars, and find safe harbor.",
    },
    abilityScoreModifiers: { str: 2, dex: 1 },
    personalityTraits: [
      'My friends know they can rely on me, no matter what.',
      'I work hard so that I can play hard when the work is done.',
      'I\'m always picking up odds and ends from ports — mementos and curiosities.',
      'I\'ve sailed long enough to laugh at things that would terrify most people.',
    ],
    ideals: [
      'Respect. The thing that keeps a crew together is respecting the captain\'s word and each other\'s backs.',
      'Freedom. The sea is freedom — the chance to go anywhere and be bound by nothing.',
      'Mastery. I\'m a predator, and the sea is my hunting ground.',
    ],
    bonds: [
      'I\'m loyal to my captain first, everything else second.',
      'The sea took someone I loved. I still feel the weight of that.',
      'I dream of owning my own ship someday.',
    ],
    flaws: [
      'I follow orders, even if I think they\'re wrong.',
      'Once someone wrongs me, I won\'t forget or forgive.',
      'Once I start drinking, it\'s hard to stop.',
    ],
  },

  // ===== SOLDIER =====
  soldier: {
    key: 'soldier',
    name: 'Soldier',
    skillProficiencies: ['athletics', 'intimidation'],
    toolProficiencies: ['One type of gaming set', 'Vehicles (land)'],
    extraLanguageChoices: 0,
    startingEquipment: [
      'Rank insignia',
      'Trophy from a fallen enemy',
      'Set of bone dice or deck of cards',
      'Common clothes',
      '10 gp',
    ],
    feature: {
      name: 'Military Rank',
      summary:
        'You carry a rank from your service; soldiers of lower rank, and sometimes civilians, recognize your authority in military matters.',
    },
    abilityScoreModifiers: { str: 2, con: 1 },
    personalityTraits: [
      'I\'m always polite and respectful to those in authority.',
      'I face problems head-on. A simple, direct solution is the best path.',
      'I can stare down a hell hound without flinching.',
      'I have a crude sense of humor and enjoy seeing others squirm.',
    ],
    ideals: [
      'Greater Good. Our lot is to lay down our lives in defense of others.',
      'Responsibility. I do what I must and face the consequences.',
      'Live and Let Live. Ideals aren\'t worth killing over or going to war for.',
    ],
    bonds: [
      'I would still lay down my life for the people I served with.',
      'Someone saved my life on the battlefield. I owe them a debt I can\'t repay.',
      'My honor is my life.',
    ],
    flaws: [
      'The monstrous entity my comrades and I faced in battle still haunts my dreams.',
      'I have little respect for anyone who is not a proven warrior.',
      'I made a terrible mistake in battle that cost many lives — and I would do anything to keep it secret.',
    ],
  },

  // ===== URCHIN =====
  urchin: {
    key: 'urchin',
    name: 'Urchin',
    skillProficiencies: ['sleightOfHand', 'stealth'],
    toolProficiencies: ['Disguise kit', "Thieves' tools"],
    extraLanguageChoices: 0,
    startingEquipment: [
      'Small knife',
      'Map of the city where you grew up',
      'Pet mouse or similar small creature',
      'Common clothes',
      '10 gp',
    ],
    feature: {
      name: 'City Secrets',
      summary:
        'You know hidden paths and shortcuts through urban environments, letting you travel quickly through back streets and alleys.',
    },
    abilityScoreModifiers: { dex: 2, int: 1 },
    personalityTraits: [
      'I hide scraps of food and trinkets in my pockets, out of old habit.',
      'I ask a lot of questions and am rarely satisfied with vague answers.',
      'I am fiercely loyal to my friends — they\'re the only family I have.',
      'I\'ve learned to make do with almost nothing, and I resent waste.',
    ],
    ideals: [
      'Community. We have to take care of each other, because no one else will.',
      'Change. The low will be raised up and the mighty brought low.',
      'Aspiration. I\'m going to prove that I\'m better than where I came from.',
    ],
    bonds: [
      'My town or city is my home, and I\'ll fight to defend it.',
      'I sponsor an orphanage back home so other kids won\'t have the life I had.',
      'I owe a debt to a black-market fence who once looked out for me.',
    ],
    flaws: [
      'Gold seems like a lot of money to me, and I\'ll do questionable things to get it.',
      'I will never fully trust anyone who had an easy upbringing.',
      'If I\'m outnumbered, I run. Pride isn\'t worth getting killed over.',
    ],
  },
}

// Ordered list for dropdowns / UI
export const BACKGROUND_LIST: Background[] = [
  BACKGROUNDS.acolyte,
  BACKGROUNDS.charlatan,
  BACKGROUNDS.criminal,
  BACKGROUNDS.entertainer,
  BACKGROUNDS.folkHero,
  BACKGROUNDS.guildArtisan,
  BACKGROUNDS.hermit,
  BACKGROUNDS.noble,
  BACKGROUNDS.outlander,
  BACKGROUNDS.sage,
  BACKGROUNDS.sailor,
  BACKGROUNDS.soldier,
  BACKGROUNDS.urchin,
]

// ------------------------------------
// Helpers
// ------------------------------------

export function getBackground(key: BackgroundKey): Background | undefined {
  return BACKGROUNDS[key]
}
