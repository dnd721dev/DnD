// Barrel for SRD spells
// Import from here everywhere else:
//   import { SRD_SPELLS, type SrdSpell } from '@/lib/srdspells'

import type { SrdSpell } from './types'
import { CANTRIPS } from './cantrips'
import { LEVEL1_SPELLS } from './level1'
import { LEVEL2_SPELLS } from './level2'
import { LEVEL3_SPELLS } from './level3'
import { LEVEL4_SPELLS } from './level4'
import { LEVEL5_SPELLS } from './level5'
import { LEVEL6_SPELLS } from './level6'
import { LEVEL7_SPELLS } from './level7'
import { LEVEL8_SPELLS } from './level8'
import { LEVEL9_SPELLS } from './level9'

// Combine all spells into one big list the browser uses
export const SRD_SPELLS: SrdSpell[] = [
  ...CANTRIPS,
  ...LEVEL1_SPELLS,
  ...LEVEL2_SPELLS,
  ...LEVEL3_SPELLS,
  ...LEVEL4_SPELLS,
  ...LEVEL5_SPELLS,
  ...LEVEL6_SPELLS,
  ...LEVEL7_SPELLS,
  ...LEVEL8_SPELLS,
  ...LEVEL9_SPELLS,
]

// Re-export types so you can import them from '@/lib/srdspells'
export * from './types'
