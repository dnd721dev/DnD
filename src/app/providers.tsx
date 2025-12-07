'use client';

import { ReactNode, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { initWeb3Modal } from '@/lib/web3modal';

export default function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient());

  useEffect(() => {
    initWeb3Modal(); // safe on client
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
