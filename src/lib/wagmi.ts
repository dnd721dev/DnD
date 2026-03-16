// Re-export the wagmiConfig created by appkit so existing imports don't break
export { wagmiConfig, wagmiAdapter } from './appkit'

export const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453)
