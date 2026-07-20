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
    <div className="relative flex items-center gap-1.5">
      <appkit-button
        label="Connect Wallet"
        balance="hide"
        size="md"
      />
      {/* QR-scanner help lives behind a small toggle so it never eats header
          space. CSS-only disclosure — keyboard and screen-reader friendly. */}
      <details className="group relative">
        <summary
          aria-label="Wallet connection help"
          title="Wallet connection help"
          className="flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full border border-slate-600 text-[10px] text-slate-400 hover:border-slate-400 hover:text-slate-200 [&::-webkit-details-marker]:hidden"
        >
          ?
        </summary>
        <p className="absolute right-0 top-7 z-50 w-64 rounded-lg border border-slate-700 bg-slate-900 p-3 text-left text-[11px] leading-snug text-slate-300 shadow-xl">
          Wallet has no built-in QR scanner (Rabby, Frame, etc.)?{' '}
          <span className="text-slate-100">Click your wallet&apos;s tile</span> in the
          modal — that shows a wallet-specific QR your phone camera can open
          directly.
        </p>
      </details>
    </div>
  )
}
