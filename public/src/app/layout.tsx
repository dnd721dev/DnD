import './globals.css'
import Providers from './providers'
import WalletJwtGate from '@/components/auth/WalletJwtGate'
import Header from '@/components/layout/header' // <-- make sure this path matches your project

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070a12] text-white">
        <Providers>
          <WalletJwtGate />
          <Header />
          <main className="px-6 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
