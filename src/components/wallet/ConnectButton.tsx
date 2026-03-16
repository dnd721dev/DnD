'use client'

// Reown AppKit provides <appkit-button> as a custom element.
// It handles: desktop injection (MetaMask, etc.), WalletConnect QR,
// mobile deep links, Coinbase Wallet, and 300+ other wallets.

// Declare the custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        label?: string
        balance?: 'show' | 'hide'
        size?: 'md' | 'sm'
        disabled?: boolean
      }
    }
  }
}

export function ConnectButton() {
  return (
    <appkit-button
      label="Connect Wallet"
      balance="hide"
      size="md"
    />
  )
}
