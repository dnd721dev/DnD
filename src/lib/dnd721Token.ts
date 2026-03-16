// DND721 token contract on Base chain

export const DND721_TOKEN_ADDRESS =
  '0x85878508D21db40D53Aa38571022e6673dabe317' as const

export const DND721_TOKEN_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',    type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const

/** Convert whole DND721 token units to wei (18 decimals) */
export function toTokenWei(wholeTokens: number): bigint {
  return BigInt(Math.floor(wholeTokens)) * 10n ** 18n
}

/** Flat price to sponsor a custom monster (in whole DND721 tokens) */
export const SPONSOR_MONSTER_PRICE = 150
