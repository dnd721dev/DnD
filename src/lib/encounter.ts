// 5e DMG Encounter Difficulty Calculator

// XP thresholds per character level [easy, medium, hard, deadly]
const THRESHOLDS_BY_LEVEL: [number, number, number, number][] = [
  [25,   50,   75,   100],  // 1
  [50,   100,  150,  200],  // 2
  [75,   150,  225,  400],  // 3
  [125,  250,  375,  500],  // 4
  [250,  500,  750,  1100], // 5
  [300,  600,  900,  1400], // 6
  [350,  750,  1100, 1700], // 7
  [450,  900,  1400, 2100], // 8
  [550,  1100, 1600, 2400], // 9
  [600,  1200, 1900, 2800], // 10
  [800,  1600, 2400, 3600], // 11
  [1000, 2000, 3000, 4500], // 12
  [1100, 2200, 3400, 5100], // 13
  [1250, 2500, 3800, 5700], // 14
  [1400, 2800, 4300, 6400], // 15
  [1600, 3200, 4800, 7200], // 16
  [2000, 3900, 5900, 8800], // 17
  [2100, 4200, 6300, 9500], // 18
  [2400, 4900, 7300, 10900],// 19
  [2800, 5700, 8500, 12700],// 20
]

export const CR_OPTIONS = [
  '0','1/8','1/4','1/2',
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24',
] as const

export type CRKey = typeof CR_OPTIONS[number]

export const CR_XP: Record<string, number> = {
  '0':   10,  '1/8': 25,  '1/4': 50,   '1/2': 100,
  '1':   200, '2':   450, '3':   700,   '4':   1100,
  '5':   1800,'6':   2300,'7':   2900,  '8':   3900,
  '9':   5000,'10':  5900,'11':  7200,  '12':  8400,
  '13':  10000,'14': 11500,'15': 13000, '16':  15000,
  '17':  18000,'18': 20000,'19': 22000, '20':  25000,
  '21':  33000,'22': 41000,'23': 50000, '24':  62000,
}

export type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly'

function monsterMultiplier(count: number, partySize: number): number {
  // Adjust effective count for small/large parties per DMG
  let n = count
  if (partySize < 3) n = Math.ceil(n * 1.5)
  else if (partySize > 5) n = Math.floor(n * 0.67)
  if (n <= 1) return 1
  if (n === 2) return 1.5
  if (n <= 6) return 2
  if (n <= 10) return 2.5
  if (n <= 14) return 3
  return 4
}

export type EncounterResult = {
  thresholds: { easy: number; medium: number; hard: number; deadly: number }
  rawXP: number
  adjustedXP: number
  multiplier: number
  difficulty: Difficulty
}

export function calculateEncounterDifficulty(
  partyLevels: number[],
  monsterCRs: string[],
): EncounterResult {
  const thresholds = partyLevels.reduce(
    (acc, lvl) => {
      const row = THRESHOLDS_BY_LEVEL[Math.max(0, Math.min(19, lvl - 1))]
      return {
        easy:   acc.easy   + row[0],
        medium: acc.medium + row[1],
        hard:   acc.hard   + row[2],
        deadly: acc.deadly + row[3],
      }
    },
    { easy: 0, medium: 0, hard: 0, deadly: 0 },
  )

  const rawXP = monsterCRs.reduce((sum, cr) => sum + (CR_XP[cr] ?? 0), 0)
  const multiplier = monsterMultiplier(monsterCRs.length, partyLevels.length)
  const adjustedXP = Math.floor(rawXP * multiplier)

  let difficulty: Difficulty = 'trivial'
  if (adjustedXP >= thresholds.deadly) difficulty = 'deadly'
  else if (adjustedXP >= thresholds.hard) difficulty = 'hard'
  else if (adjustedXP >= thresholds.medium) difficulty = 'medium'
  else if (adjustedXP >= thresholds.easy) difficulty = 'easy'

  return { thresholds, rawXP, adjustedXP, multiplier, difficulty }
}
