export type SessionStatus =
  'setup' | 'lobby' | 'active' | 'paused' | 'completed'

export const SESSION_GATES = {
  // Can players join the session?
  canJoin: (status: SessionStatus) =>
    ['lobby', 'active'].includes(status),

  // Is the map interactive (token movement, triggers)?
  canInteractWithMap: (status: SessionStatus) =>
    status === 'active',

  // Can combat actions be taken?
  canUseCombat: (status: SessionStatus) =>
    status === 'active',

  // Can players roll dice?
  canRollDice: (status: SessionStatus) =>
    ['lobby', 'active'].includes(status),

  // Can players use the shop?
  canAccessShop: (status: SessionStatus) =>
    ['lobby', 'active'].includes(status),

  // Can free shop items be claimed?
  canClaimFreeItems: (status: SessionStatus) =>
    status === 'active',

  // Can paid shop items be purchased?
  canPurchaseItems: (status: SessionStatus) =>
    ['lobby', 'active'].includes(status),

  // Is voice chat available?
  canUseVoice: (status: SessionStatus) =>
    ['lobby', 'active', 'paused'].includes(status),

  // Can the DM start recording?
  canRecord: (status: SessionStatus) =>
    status === 'active',

  // Can the DM award XP?
  canAwardXP: (status: SessionStatus) =>
    status === 'active',

  // Is chat available?
  canChat: (status: SessionStatus) =>
    ['lobby', 'active', 'paused'].includes(status),

  // Can DM place/move tokens?
  dmCanPlaceTokens: (status: SessionStatus) =>
    ['setup', 'lobby', 'active'].includes(status),

  // Is session over?
  isCompleted: (status: SessionStatus) =>
    status === 'completed',

  // Can session be ended?
  canEnd: (status: SessionStatus) =>
    ['lobby', 'active', 'paused'].includes(status),
} as const
