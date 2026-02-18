export type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export type SessionWithCampaign = {
  id: string
  title: string | null
  status: SessionStatus
  scheduled_start: string | null
  duration_minutes: number
  campaign_id: string | null
  gm_wallet: string | null
  map_image_url: string | null
  campaigns?:
    | {
        livekit_room_name: string | null
        title: string | null
      }[]
    | null
}

export type DiceEntry = {
  id: string
  roller: string
  label: string
  result: number
  formula: string
  timestamp: string
  outcome?: string | null
}

export type ExternalRoll = {
  label: string
  formula: string
  result: number
  outcome?: string | null
}

// Loose character summary – we only care about a few fields
export type CharacterSummary = {
  id: string
  name?: string | null
  abilities?: {
    str?: number | string
    dex?: number | string
    con?: number | string
    int?: number | string
    wis?: number | string
    cha?: number | string
    [key: string]: number | string | undefined
  }
  [key: string]: any
}
