// src/types/character.ts

export type Abilities = {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export type SkillProficiencies = {
  [key: string]: boolean
}

export type Character = {
  id: string
  wallet_address: string
  name: string
  race: string
  main_job: string
  level: number
  ac: number
  proficiency: number
  abilities: Abilities
  hit_points_current: number
  hit_points_max: number
  nft_contract?: string | null
  nft_token_id?: string | null
  avatar_url?: string | null

  background?: string | null
  equipment?: string[] | null
  saving_throw_profs?: string[] | null
  languages?: string[] | null
  skill_proficiencies?: SkillProficiencies
}
