import './globals.css';
import Providers from './providers';
import Header from '@/components/layout/header';

export const metadata = {
  title: 'DND721',
  description: 'NFT-powered TTRPG platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <Providers>
          <div className="mx-auto max-w-6xl p-4">
            <Header />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
