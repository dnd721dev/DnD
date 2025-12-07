// src/lib/conditions.ts
// SRD-style conditions for DND721.
// These are short, paraphrased summaries meant as reminders, not full rules text.

export type ConditionKey =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'
  | 'exhaustion'

export type Condition = {
  key: ConditionKey
  name: string
  /**
   * SRD-style original reminder text.
   * Keep this short – full rules live in the rulebooks.
   */
  summary: string
  /**
   * Optional quick bullet points for UI display.
   * Also paraphrased / simplified.
   */
  bullets?: string[]
}

export const CONDITIONS: Record<ConditionKey, Condition> = {
  blinded: {
    key: 'blinded',
    name: 'Blinded',
    summary:
      'You cannot see, and your senses that depend on sight fail you.',
    bullets: [
      'You automatically fail any check that needs sight.',
      'Attack rolls against you are easier.',
      'Your own attack rolls are harder.',
    ],
  },
  charmed: {
    key: 'charmed',
    name: 'Charmed',
    summary:
      'Your attitude toward the charmer is softened, and it’s hard for you to fight them.',
    bullets: [
      'You cannot attack the creature charming you.',
      'The charmer has an edge on social checks to influence you.',
    ],
  },
  deafened: {
    key: 'deafened',
    name: 'Deafened',
    summary:
      'You cannot hear, and you may miss sound-based clues.',
    bullets: [
      'You automatically fail checks that rely purely on hearing.',
    ],
  },
  frightened: {
    key: 'frightened',
    name: 'Frightened',
    summary:
      'You are overwhelmed by fear of a specific source.',
    bullets: [
      'You have a harder time on attacks and ability checks while the source of fear is in sight.',
      'You cannot willingly move closer to the source of your fear.',
    ],
  },
  grappled: {
    key: 'grappled',
    name: 'Grappled',
    summary:
      'You’re held in place by another creature or effect.',
    bullets: [
      'Your speed drops to 0 and cannot be increased.',
      'The condition ends if your grappler is removed from you or you are moved out of reach.',
    ],
  },
  incapacitated: {
    key: 'incapacitated',
    name: 'Incapacitated',
    summary:
      'You are unable to take actions or reactions.',
    bullets: [
      'You still remain conscious unless another condition says otherwise.',
    ],
  },
  invisible: {
    key: 'invisible',
    name: 'Invisible',
    summary:
      'You cannot be seen without special senses or magic.',
    bullets: [
      'You are hard to hit, and you can usually hide more easily.',
      'You still make noise and leave tracks unless something says otherwise.',
    ],
  },
  paralyzed: {
    key: 'paralyzed',
    name: 'Paralyzed',
    summary:
      'Your body is locked up and you cannot move.',
    bullets: [
      'You cannot move, speak, or take actions or reactions.',
      'You automatically fail Strength and Dexterity saves.',
      'Attacks against you are easier, and close-range hits strike especially hard.',
    ],
  },
  petrified: {
    key: 'petrified',
    name: 'Petrified',
    summary:
      'You are transformed into solid material, like stone.',
    bullets: [
      'You are treated as an object rather than a creature while in this state.',
      'You are unaware of your surroundings.',
      'You are extremely hard to damage but also cannot act.',
    ],
  },
  poisoned: {
    key: 'poisoned',
    name: 'Poisoned',
    summary:
      'Toxins or foul substances hinder your body.',
    bullets: [
      'You have a harder time on attack rolls and ability checks.',
    ],
  },
  prone: {
    key: 'prone',
    name: 'Prone',
    summary:
      'You are lying on the ground rather than standing.',
    bullets: [
      'You have a harder time attacking.',
      'Close-range attacks against you are easier; long-range shots are harder.',
      'You need to spend movement to stand up.',
    ],
  },
  restrained: {
    key: 'restrained',
    name: 'Restrained',
    summary:
      'Your movement is bound by chains, webs, or similar restraints.',
    bullets: [
      'Your speed is 0 and cannot be increased.',
      'You have a harder time on attacks and Dexterity saves.',
      'Attacks against you are easier.',
    ],
  },
  stunned: {
    key: 'stunned',
    name: 'Stunned',
    summary:
      'A heavy blow or effect leaves you reeling and unable to act.',
    bullets: [
      'You cannot move and can only speak in broken, slurred ways.',
      'You cannot take actions or reactions.',
      'You automatically fail Strength and Dexterity saves.',
      'Attacks against you are easier.',
    ],
  },
  unconscious: {
    key: 'unconscious',
    name: 'Unconscious',
    summary:
      'You are knocked out and unaware of your surroundings.',
    bullets: [
      'You drop whatever you are holding and fall prone.',
      'You cannot move, speak, or take actions or reactions.',
      'You are unaware of the world around you.',
      'Attacks against you are easier, and close-range hits strike especially hard.',
    ],
  },
  exhaustion: {
    key: 'exhaustion',
    name: 'Exhaustion',
    summary:
      'You are worn down by travel, hunger, or strain, gaining stacking penalties.',
    bullets: [
      'Exhaustion is tracked in multiple levels.',
      'Each level applies an additional penalty; reaching the final level can be fatal.',
      'Rest, food, or magic can remove exhaustion over time.',
    ],
  },
}

// Ordered list for UI loops
export const CONDITION_LIST: Condition[] = [
  CONDITIONS.blinded,
  CONDITIONS.charmed,
  CONDITIONS.deafened,
  CONDITIONS.frightened,
  CONDITIONS.grappled,
  CONDITIONS.incapacitated,
  CONDITIONS.invisible,
  CONDITIONS.paralyzed,
  CONDITIONS.petrified,
  CONDITIONS.poisoned,
  CONDITIONS.prone,
  CONDITIONS.restrained,
  CONDITIONS.stunned,
  CONDITIONS.unconscious,
  CONDITIONS.exhaustion,
]

// Helper to look up a condition by key
export function getCondition(key: ConditionKey): Condition | undefined {
  return CONDITIONS[key]
}
