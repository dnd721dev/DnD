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
    <div className="flex flex-col items-center gap-1.5">
      <appkit-button
        label="Connect Wallet"
        balance="hide"
        size="md"
      />
      <p className="max-w-xs text-center text-[10px] leading-snug text-slate-400">
        Wallet has no built-in QR scanner (Rabby, Frame, etc.)?{' '}
        <span className="text-slate-300">Click your wallet's tile</span> in the
        modal — that shows a wallet-specific QR your phone camera can open
        directly.
      </p>
    </div>
  )
}
