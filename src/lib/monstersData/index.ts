import type { Monster } from './types'
import { ABERRATIONS } from './aberrations'
import { BEASTS } from './beasts'
import { CELESTIALS } from './celestials'
import { CONSTRUCTS } from './constructs'
import { DRAGONS } from './dragons'
import { ELEMENTALS } from './elementals'
import { FEY } from './fey'
import { FIENDS } from './fiends'
import { GIANTS } from './giants'
import { HUMANOIDS } from './humanoids'
import { MONSTROSITIES } from './monstrosities'
import { OOZES } from './oozes'
import { PLANTS } from './plants'
import { UNDEAD } from './undead'

export const ALL_SRD_MONSTERS: Monster[] = [
  ...ABERRATIONS,
  ...BEASTS,
  ...CELESTIALS,
  ...CONSTRUCTS,
  ...DRAGONS,
  ...ELEMENTALS,
  ...FEY,
  ...FIENDS,
  ...GIANTS,
  ...HUMANOIDS,
  ...MONSTROSITIES,
  ...OOZES,
  ...PLANTS,
  ...UNDEAD,
]

export * from './types'
